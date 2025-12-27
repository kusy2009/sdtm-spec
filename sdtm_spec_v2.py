"""
SDTM Spec Service V2
====================
Enhanced service that creates separate JSON files for:
1. Domain specification (variables, metadata)
2. Related codelists (only those used by the domain)

Features:
- Fetches domain specs from CDISC Library API (SDTMIG)
- Automatically fetches only related codelists
- Caches responses to avoid repeated API calls
- Saves as separate JSON files for AI consumption
- Supports version selection (defaults to latest)
"""

import os
import json
import hashlib
import re
from pathlib import Path
from typing import Optional, Dict, List, Any, Tuple
from datetime import datetime, timedelta
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class SDTMSpecServiceV2:
    """Enhanced service for fetching and saving SDTM specifications."""
    
    # Default SDTMIG version (this is stable, rarely changes)
    DEFAULT_IG_VERSION = "3-4"
    AVAILABLE_IG_VERSIONS = ["3-4", "3-3", "3-2", "3-1-3", "3-1-2"]
    
    # Cache expiry in days
    CACHE_EXPIRY_DAYS = 30
    
    # CT versions will be fetched dynamically
    _ct_versions_cache: List[str] = []
    _ct_versions_fetched: bool = False
    
    def __init__(self, api_key: Optional[str] = None, 
                 cache_dir: Optional[str] = None,
                 output_dir: Optional[str] = None):
        """
        Initialize the SDTM Spec Service V2.
        
        Args:
            api_key: CDISC Library API key
            cache_dir: Directory for caching API responses
            output_dir: Directory for saving spec/codelist JSON files
        """
        self.api_key = api_key or os.getenv("CDISC_API_KEY")
        if not self.api_key:
            print("Warning: No CDISC_API_KEY found. Set it in .env file or pass as parameter.")
        self.base_url = "https://library.cdisc.org/api/mdr"
        self.headers = {
            "api-key": self.api_key or "",
            "Accept": "application/json"
        }
        
        # Setup directories
        base_path = Path(__file__).parent
        self.cache_dir = Path(cache_dir) if cache_dir else base_path / "cache"
        self.output_dir = Path(output_dir) if output_dir else base_path / "output"
        
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # In-memory cache
        self._memory_cache: Dict[str, Any] = {}
    
    # ========== Caching Methods ==========
    
    def _get_cache_key(self, endpoint: str) -> str:
        """Generate cache key from endpoint."""
        return hashlib.md5(endpoint.encode()).hexdigest()
    
    def _get_cache_path(self, cache_key: str) -> Path:
        """Get file path for cached response."""
        return self.cache_dir / f"{cache_key}.json"
    
    def _is_cache_valid(self, cache_path: Path) -> bool:
        """Check if cache file exists and is not expired."""
        if not cache_path.exists():
            return False
        file_time = datetime.fromtimestamp(cache_path.stat().st_mtime)
        expiry_time = datetime.now() - timedelta(days=self.CACHE_EXPIRY_DAYS)
        return file_time > expiry_time
    
    def _load_from_cache(self, endpoint: str) -> Optional[Dict]:
        """Load from memory or disk cache."""
        cache_key = self._get_cache_key(endpoint)
        
        if cache_key in self._memory_cache:
            return self._memory_cache[cache_key]
        
        cache_path = self._get_cache_path(cache_key)
        if self._is_cache_valid(cache_path):
            with open(cache_path, 'r') as f:
                data = json.load(f)
                self._memory_cache[cache_key] = data
                return data
        return None
    
    def _save_to_cache(self, endpoint: str, data: Dict) -> None:
        """Save to memory and disk cache."""
        cache_key = self._get_cache_key(endpoint)
        self._memory_cache[cache_key] = data
        cache_path = self._get_cache_path(cache_key)
        with open(cache_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def _fetch_from_api(self, endpoint: str) -> Optional[Dict]:
        """Fetch data from CDISC Library API."""
        url = f"{self.base_url}{endpoint}"
        try:
            response = requests.get(url, headers=self.headers, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"API Error for {endpoint}: {e}")
            return None
    
    def _get_data(self, endpoint: str, use_cache: bool = True) -> Optional[Dict]:
        """Get data from cache or API."""
        if use_cache:
            cached = self._load_from_cache(endpoint)
            if cached:
                return cached
        
        data = self._fetch_from_api(endpoint)
        if data:
            self._save_to_cache(endpoint, data)
        return data
    
    # ========== Version Methods ==========
    
    def get_available_ig_versions(self) -> List[str]:
        """Get available SDTMIG versions."""
        return self.AVAILABLE_IG_VERSIONS.copy()
    
    def _fetch_ct_versions_from_api(self) -> List[str]:
        """Fetch available SDTM CT versions from CDISC Library API."""
        endpoint = "/ct/packages"
        data = self._get_data(endpoint)
        
        if not data:
            # Fallback to hardcoded if API fails
            return ["2025-09-26", "2025-03-28", "2024-09-27", "2024-03-29", "2023-12-15"]
        
        packages = data.get("_links", {}).get("packages", [])
        ct_versions = []
        
        for pkg in packages:
            href = pkg.get("href", "")
            # Extract version from href like /mdr/ct/packages/sdtmct-2025-09-26
            if "sdtmct-" in href:
                version = href.split("sdtmct-")[-1]
                ct_versions.append(version)
        
        # Sort by date descending (newest first), take last 3 years (~12 versions)
        ct_versions.sort(reverse=True)
        return ct_versions[:12]
    
    def get_available_ct_versions(self) -> List[str]:
        """Get available CT versions (dynamically fetched from API)."""
        if not SDTMSpecServiceV2._ct_versions_fetched:
            SDTMSpecServiceV2._ct_versions_cache = self._fetch_ct_versions_from_api()
            SDTMSpecServiceV2._ct_versions_fetched = True
        return SDTMSpecServiceV2._ct_versions_cache.copy()
    
    def get_default_ct_version(self) -> str:
        """Get the latest CT version (first in the list)."""
        versions = self.get_available_ct_versions()
        return versions[0] if versions else "2025-09-26"
    
    def get_all_domains(self, version: Optional[str] = None) -> Dict[str, Any]:
        """Get list of all domains in SDTMIG."""
        version = version or self.DEFAULT_IG_VERSION
        endpoint = f"/sdtmig/{version}/datasets"
        
        data = self._get_data(endpoint)
        if not data:
            return {"error": "Failed to fetch domains", "version": version}
        
        datasets = data.get("_links", {}).get("datasets", [])
        
        # Extract domain code from href (e.g., /mdr/sdtmig/3-4/datasets/VS -> VS)
        domains = []
        for ds in datasets:
            href = ds.get("href", "")
            code = href.split("/")[-1] if href else ""
            domains.append({
                "code": code,
                "name": ds.get("title", ""),
                "href": href
            })
        
        return {
            "version": version,
            "total_domains": len(domains),
            "domains": domains,
            "fetched_at": datetime.now().isoformat()
        }
    
    # ========== Domain Spec Methods ==========
    
    def _extract_codelist_codes(self, variables: List[Dict]) -> List[str]:
        """Extract unique codelist codes from variables."""
        codes = set()
        for var in variables:
            href = var.get("codelist_href", "")
            if href:
                # Extract code like C66741 from href
                match = re.search(r'/codelists/(C\d+)', href)
                if match:
                    codes.add(match.group(1))
        return sorted(list(codes))
    
    def _fetch_codelist(self, codelist_code: str, ct_version: Optional[str] = None) -> Optional[Dict]:
        """Fetch a single codelist."""
        version = ct_version or self.get_default_ct_version()
        endpoint = f"/ct/packages/sdtmct-{version}/codelists/{codelist_code}"
        
        data = self._get_data(endpoint)
        if not data:
            return None
        
        terms = []
        for term in data.get("terms", []):
            terms.append({
                "code": term.get("conceptId"),
                "submission_value": term.get("submissionValue"),
                "preferred_term": term.get("preferredTerm"),
                "definition": term.get("definition", "")[:200] if term.get("definition") else None,
                "synonyms": term.get("synonyms", [])
            })
        
        return {
            "codelist_code": codelist_code,
            "name": data.get("name"),
            "extensible": data.get("extensible"),
            "total_terms": len(terms),
            "terms": terms
        }
    
    def get_domain_spec_and_codelists(self, domain: str, 
                                       ig_version: Optional[str] = None,
                                       ct_version: Optional[str] = None,
                                       save_files: bool = True) -> Tuple[Dict, Dict]:
        """
        Get domain specification and related codelists.
        
        Args:
            domain: Domain code (e.g., "VS", "LB")
            ig_version: SDTMIG version
            ct_version: CT version for codelists
            save_files: Whether to save JSON files
            
        Returns:
            Tuple of (spec_dict, codelists_dict)
        """
        ig_version = ig_version or self.DEFAULT_IG_VERSION
        ct_version = ct_version or self.get_default_ct_version()
        domain = domain.upper()
        
        # Fetch domain spec
        endpoint = f"/sdtmig/{ig_version}/datasets/{domain}"
        data = self._get_data(endpoint)
        
        if not data:
            return ({"error": f"Failed to fetch domain {domain}"}, {})
        
        # Extract class info
        parent_class = data.get("_links", {}).get("parentClass", {})
        
        # Process variables
        variables = []
        for var in data.get("datasetVariables", []):
            codelist_link = var.get("_links", {}).get("codelist", {})
            if isinstance(codelist_link, list):
                codelist_title = ", ".join([cl.get("title", "") for cl in codelist_link])
                codelist_href = codelist_link[0].get("href", "") if codelist_link else None
                codelist_codes = [re.search(r'/codelists/(C\d+)', cl.get("href", "")).group(1) 
                                 for cl in codelist_link 
                                 if re.search(r'/codelists/(C\d+)', cl.get("href", ""))]
            else:
                codelist_title = codelist_link.get("title") if codelist_link else None
                codelist_href = codelist_link.get("href") if codelist_link else None
                match = re.search(r'/codelists/(C\d+)', codelist_href or "")
                codelist_codes = [match.group(1)] if match else []
            
            variables.append({
                "order": var.get("ordinal"),
                "name": var.get("name"),
                "label": var.get("label"),
                "type": var.get("simpleDatatype"),
                "length": var.get("length"),
                "core": var.get("core"),
                "role": var.get("role"),
                "codelist": codelist_title,
                "codelist_codes": codelist_codes,
                "codelist_href": codelist_href,
                "description": var.get("description", "")
            })
        
        # Sort by order
        variables.sort(key=lambda x: int(x.get("order") or 999))
        
        # Build spec dictionary
        spec = {
            "domain": domain,
            "label": data.get("label"),
            "class": parent_class.get("title"),
            "class_href": parent_class.get("href"),
            "ig_version": ig_version,
            "total_variables": len(variables),
            "variables": variables,
            "variable_summary": {
                "required": len([v for v in variables if v.get("core") == "Req"]),
                "expected": len([v for v in variables if v.get("core") == "Exp"]),
                "permissible": len([v for v in variables if v.get("core") == "Perm"])
            },
            "codelist_codes_used": self._extract_codelist_codes(variables),
            "fetched_at": datetime.now().isoformat()
        }
        
        # Fetch related codelists
        codelist_codes = spec["codelist_codes_used"]
        codelists = {
            "domain": domain,
            "ig_version": ig_version,
            "ct_version": ct_version,
            "total_codelists": len(codelist_codes),
            "codelists": [],
            "fetched_at": datetime.now().isoformat()
        }
        
        for code in codelist_codes:
            cl_data = self._fetch_codelist(code, ct_version)
            if cl_data:
                codelists["codelists"].append(cl_data)
        
        # Save files if requested
        if save_files:
            self._save_spec_files(domain, ig_version, ct_version, spec, codelists)
        
        return spec, codelists
    
    def _save_spec_files(self, domain: str, ig_version: str, ct_version: str,
                        spec: Dict, codelists: Dict) -> Tuple[Path, Path]:
        """Save spec and codelists as separate JSON files."""
        # Create domain-specific output directory
        domain_dir = self.output_dir / domain.lower()
        domain_dir.mkdir(parents=True, exist_ok=True)
        
        # Save spec file (only IG version)
        spec_file = domain_dir / f"{domain.lower()}_spec_v{ig_version}.json"
        with open(spec_file, 'w') as f:
            json.dump(spec, f, indent=2)
        
        # Save codelists file (with CT version)
        codelists_file = domain_dir / f"{domain.lower()}_codelists_ig{ig_version}_ct{ct_version}.json"
        with open(codelists_file, 'w') as f:
            json.dump(codelists, f, indent=2)
        
        print(f"Saved: {spec_file}")
        print(f"Saved: {codelists_file}")
        
        return spec_file, codelists_file
    
    def get_saved_specs(self) -> List[Dict]:
        """Get list of already saved domain specs."""
        saved = []
        for domain_dir in self.output_dir.iterdir():
            if domain_dir.is_dir():
                for spec_file in domain_dir.glob("*_spec_*.json"):
                    saved.append({
                        "domain": domain_dir.name.upper(),
                        "spec_file": str(spec_file),
                        "codelists_file": str(spec_file).replace("_spec_", "_codelists_"),
                        "modified": datetime.fromtimestamp(spec_file.stat().st_mtime).isoformat()
                    })
        return saved
    
    def load_spec(self, domain: str, version: Optional[str] = None) -> Optional[Dict]:
        """Load saved spec from file."""
        version = version or self.DEFAULT_IG_VERSION
        spec_file = self.output_dir / domain.lower() / f"{domain.lower()}_spec_v{version}.json"
        
        if spec_file.exists():
            with open(spec_file, 'r') as f:
                return json.load(f)
        return None
    
    def load_codelists(self, domain: str, ig_version: Optional[str] = None, 
                       ct_version: Optional[str] = None) -> Optional[Dict]:
        """Load saved codelists from file."""
        ig_version = ig_version or self.DEFAULT_IG_VERSION
        ct_version = ct_version or self.get_default_ct_version()
        codelists_file = self.output_dir / domain.lower() / f"{domain.lower()}_codelists_ig{ig_version}_ct{ct_version}.json"
        
        if codelists_file.exists():
            with open(codelists_file, 'r') as f:
                return json.load(f)
        return None
    
    # ========== Utility Methods ==========
    
    def clear_cache(self, memory_only: bool = False) -> Dict[str, Any]:
        """Clear cached data."""
        memory_cleared = len(self._memory_cache)
        self._memory_cache.clear()
        
        disk_cleared = 0
        if not memory_only:
            for cache_file in self.cache_dir.glob("*.json"):
                cache_file.unlink()
                disk_cleared += 1
        
        return {
            "memory_entries_cleared": memory_cleared,
            "disk_files_cleared": disk_cleared
        }
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        disk_files = list(self.cache_dir.glob("*.json"))
        total_size = sum(f.stat().st_size for f in disk_files)
        
        return {
            "memory_entries": len(self._memory_cache),
            "disk_files": len(disk_files),
            "disk_size_mb": round(total_size / (1024 * 1024), 2),
            "cache_directory": str(self.cache_dir),
            "output_directory": str(self.output_dir)
        }


# CLI for testing
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="SDTM Spec Service V2")
    parser.add_argument("command", choices=["fetch", "domains", "list", "cache"],
                       help="Command to execute")
    parser.add_argument("--domain", "-d", help="Domain code (e.g., VS)")
    parser.add_argument("--ig-version", "-v", default="3-4", help="SDTMIG version")
    parser.add_argument("--ct-version", default="2024-09-27", help="CT version")
    parser.add_argument("--clear", action="store_true", help="Clear cache")
    
    args = parser.parse_args()
    
    service = SDTMSpecServiceV2()
    
    if args.command == "fetch":
        if not args.domain:
            print("Error: --domain is required")
        else:
            spec, codelists = service.get_domain_spec_and_codelists(
                args.domain, args.ig_version, args.ct_version
            )
            print(f"\nSpec: {spec.get('total_variables', 0)} variables")
            print(f"Codelists: {codelists.get('total_codelists', 0)} codelists")
            print(f"Codelist codes: {spec.get('codelist_codes_used', [])}")
    
    elif args.command == "domains":
        result = service.get_all_domains(args.ig_version)
        print(f"SDTMIG {result.get('version')}: {result.get('total_domains')} domains")
        domains = [d.get('name') for d in result.get('domains', [])]
        for i in range(0, len(domains), 8):
            print("  " + "  ".join(domains[i:i+8]))
    
    elif args.command == "list":
        saved = service.get_saved_specs()
        print(f"Saved specs: {len(saved)}")
        for s in saved:
            print(f"  {s['domain']}: {s['spec_file']}")
    
    elif args.command == "cache":
        if args.clear:
            result = service.clear_cache()
            print(f"Cleared: {result}")
        else:
            stats = service.get_cache_stats()
            print(json.dumps(stats, indent=2))
