"""
Flask Backend API for SDTM Spec Service
========================================
REST API endpoints for the React frontend.

Endpoints:
- GET /api/versions          - Get available SDTMIG versions
- GET /api/domains           - Get all domains for a version
- GET /api/spec/<domain>     - Get domain specification
- GET /api/codelists/<domain> - Get domain codelists
- POST /api/fetch/<domain>   - Fetch and save domain spec + codelists
- GET /api/saved             - List saved specs
- GET /api/cache/stats       - Get cache statistics
- POST /api/cache/clear      - Clear cache
"""

import os
import sys
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from sdtm_spec_v2 import SDTMSpecServiceV2

# Initialize Flask app with static folder for React build
app = Flask(__name__, static_folder='frontend/build', static_url_path='')
CORS(app)  # Enable CORS for React frontend

# Initialize service
service = SDTMSpecServiceV2()


# ========== API Endpoints ==========

@app.route('/api/versions', methods=['GET'])
def get_versions():
    """Get available SDTMIG and CT versions (CT versions fetched dynamically from CDISC API)."""
    return jsonify({
        "ig_versions": service.get_available_ig_versions(),
        "ct_versions": service.get_available_ct_versions(),
        "default_ig_version": service.DEFAULT_IG_VERSION,
        "default_ct_version": service.get_default_ct_version()
    })


@app.route('/api/domains', methods=['GET'])
def get_domains():
    """Get all domains for a version."""
    version = request.args.get('version', service.DEFAULT_IG_VERSION)
    result = service.get_all_domains(version)
    return jsonify(result)


@app.route('/api/spec/<domain>', methods=['GET'])
def get_spec(domain: str):
    """Get domain specification (from saved file or fetch)."""
    version = request.args.get('version', service.DEFAULT_IG_VERSION)
    
    # Try to load from saved file first
    spec = service.load_spec(domain, version)
    
    if spec:
        spec['source'] = 'saved'
        return jsonify(spec)
    
    # Fetch if not saved
    spec, _ = service.get_domain_spec_and_codelists(
        domain, version, save_files=True
    )
    spec['source'] = 'fetched'
    return jsonify(spec)


@app.route('/api/codelists/<domain>', methods=['GET'])
def get_codelists(domain: str):
    """Get domain codelists (from saved file or fetch)."""
    ig_version = request.args.get('version', service.DEFAULT_IG_VERSION)
    ct_version = request.args.get('ct_version', service.get_default_ct_version())
    
    # Try to load from saved file first (with CT version in filename)
    codelists = service.load_codelists(domain, ig_version, ct_version)
    
    if codelists:
        codelists['source'] = 'saved'
        return jsonify(codelists)
    
    # Fetch if not saved
    _, codelists = service.get_domain_spec_and_codelists(
        domain, ig_version, ct_version, save_files=True
    )
    codelists['source'] = 'fetched'
    return jsonify(codelists)


@app.route('/api/fetch/<domain>', methods=['POST'])
def fetch_domain(domain: str):
    """Fetch and save domain spec + codelists."""
    data = request.get_json() or {}
    ig_version = data.get('ig_version', service.DEFAULT_IG_VERSION)
    ct_version = data.get('ct_version', service.DEFAULT_CT_VERSION)
    
    spec, codelists = service.get_domain_spec_and_codelists(
        domain, ig_version, ct_version, save_files=True
    )
    
    if 'error' in spec:
        return jsonify(spec), 400
    
    return jsonify({
        "success": True,
        "domain": domain,
        "ig_version": ig_version,
        "ct_version": ct_version,
        "spec_variables": spec.get('total_variables', 0),
        "codelists_count": codelists.get('total_codelists', 0),
        "codelist_codes": spec.get('codelist_codes_used', [])
    })


@app.route('/api/saved', methods=['GET'])
def get_saved():
    """List saved domain specs."""
    saved = service.get_saved_specs()
    return jsonify({
        "total": len(saved),
        "specs": saved
    })


@app.route('/api/cache/stats', methods=['GET'])
def cache_stats():
    """Get cache statistics."""
    return jsonify(service.get_cache_stats())


@app.route('/api/cache/clear', methods=['POST'])
def cache_clear():
    """Clear cache."""
    memory_only = request.get_json().get('memory_only', False) if request.get_json() else False
    result = service.clear_cache(memory_only)
    return jsonify(result)


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "healthy", "service": "sdtm-spec-gen"})


@app.route('/api/spec/all', methods=['GET'])
def get_all_specs():
    """Get complete SDTM spec for all domains."""
    version = request.args.get('version', service.DEFAULT_IG_VERSION)
    
    # Get all domains
    domains_result = service.get_all_domains(version)
    if 'error' in domains_result:
        return jsonify(domains_result), 400
    
    all_specs = {
        "ig_version": version,
        "total_domains": len(domains_result.get('domains', [])),
        "domains": {}
    }
    
    # Collect specs for each domain (from cache/saved files only to avoid timeouts)
    for domain_info in domains_result.get('domains', []):
        domain_name = domain_info.get('name', '')
        if domain_name:
            spec = service.load_spec(domain_name, version)
            if spec:
                all_specs["domains"][domain_name] = {
                    "label": domain_info.get('label', ''),
                    "class": domain_info.get('class', ''),
                    "variables": spec.get('variables', []),
                    "total_variables": spec.get('total_variables', 0)
                }
    
    all_specs["domains_loaded"] = len(all_specs["domains"])
    return jsonify(all_specs)


@app.route('/api/codelists/all', methods=['GET'])
def get_all_codelists():
    """Get all codelists for all cached domains."""
    ig_version = request.args.get('version', service.DEFAULT_IG_VERSION)
    ct_version = request.args.get('ct_version', service.get_default_ct_version())
    
    all_codelists = {
        "ig_version": ig_version,
        "ct_version": ct_version,
        "domains": {}
    }
    
    # Get saved specs to know which domains have codelists
    saved = service.get_saved_specs()
    
    for spec_info in saved:
        domain = spec_info.get('domain', '')
        codelists = service.load_codelists(domain, ig_version, ct_version)
        if codelists:
            all_codelists["domains"][domain] = codelists.get('codelists', [])
    
    all_codelists["domains_loaded"] = len(all_codelists["domains"])
    return jsonify(all_codelists)


# ========== Error Handlers ==========

@app.errorhandler(404)
def not_found(e):
    # Serve React app for any non-API routes
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/')
def serve_react():
    """Serve React frontend."""
    return send_from_directory(app.static_folder, 'index.html')


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500


# ========== Main ==========

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5050))
    debug = os.environ.get('DEBUG', 'true').lower() == 'true'
    
    print(f"Starting SDTM Spec Gen API on port {port}")
    print(f"API Endpoints:")
    print(f"  GET  /api/versions")
    print(f"  GET  /api/domains?version=3-4")
    print(f"  GET  /api/spec/<domain>?version=3-4")
    print(f"  GET  /api/spec/all?version=3-4          <- NEW: All domains")
    print(f"  GET  /api/codelists/<domain>?version=3-4")
    print(f"  GET  /api/codelists/all?version=3-4     <- NEW: All codelists")
    print(f"  POST /api/fetch/<domain>")
    print(f"  GET  /api/saved")
    print(f"  GET  /api/cache/stats")
    print(f"  POST /api/cache/clear")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
