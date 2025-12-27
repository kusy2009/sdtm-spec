import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// API base URL
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5050';

function App() {
  // State
  const [igVersions, setIgVersions] = useState([]);
  const [ctVersions, setCtVersions] = useState([]);
  const [domains, setDomains] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState('3-4');
  const [selectedCtVersion, setSelectedCtVersion] = useState('2025-03-28');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [spec, setSpec] = useState(null);
  const [codelists, setCodelists] = useState(null);
  const [activeTab, setActiveTab] = useState('spec');
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [error, setError] = useState(null);
  const [expandedCodelist, setExpandedCodelist] = useState(null);
  const [coreFilter, setCoreFilter] = useState('all'); // 'all', 'Req', 'Exp', 'Perm'
  const [sortConfig, setSortConfig] = useState({ key: 'order', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState(''); // Search filter
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true'); // Dark mode
  const [compareMode, setCompareMode] = useState(false); // Compare mode
  const [compareDomain, setCompareDomain] = useState(''); // Second domain for comparison
  const [compareSpec, setCompareSpec] = useState(null); // Second domain spec
  const [copyFeedback, setCopyFeedback] = useState(''); // Copy feedback message

  // Apply dark mode to body
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Fetch versions on mount
  useEffect(() => {
    axios.get(`${API_BASE}/api/versions`)
      .then(res => {
        setIgVersions(res.data.ig_versions || []);
        setCtVersions(res.data.ct_versions || []);
        setSelectedVersion(res.data.default_ig_version || '3-4');
        setSelectedCtVersion(res.data.default_ct_version || '2025-03-28');
      })
      .catch(err => console.error('Failed to fetch versions:', err));
  }, []);

  // Fetch domains when version changes
  useEffect(() => {
    if (selectedVersion) {
      axios.get(`${API_BASE}/api/domains?version=${selectedVersion}`)
        .then(res => {
          setDomains(res.data.domains || []);
        })
        .catch(err => console.error('Failed to fetch domains:', err));
    }
  }, [selectedVersion]);

  // Fetch domain spec
  const fetchSpec = useCallback(async () => {
    if (!selectedDomain) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [specRes, codelistsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/spec/${selectedDomain}?version=${selectedVersion}`),
        axios.get(`${API_BASE}/api/codelists/${selectedDomain}?version=${selectedVersion}&ct_version=${selectedCtVersion}`)
      ]);
      
      setSpec(specRes.data);
      setCodelists(codelistsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch specification');
    } finally {
      setLoading(false);
    }
  }, [selectedDomain, selectedVersion, selectedCtVersion]);

  // Core badge color
  const getCoreBadge = (core) => {
    const classes = {
      'Req': 'badge badge-req',
      'Exp': 'badge badge-exp',
      'Perm': 'badge badge-perm'
    };
    return classes[core] || 'badge';
  };

  // Type badge color
  const getTypeBadge = (type) => {
    return type === 'Num' ? 'badge badge-num' : 'badge badge-char';
  };

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Get sort indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return ' ↕';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // Filter and sort variables
  const getFilteredAndSortedVariables = () => {
    if (!spec?.variables) return [];
    
    let filtered = spec.variables;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v => 
        v.name?.toLowerCase().includes(term) ||
        v.label?.toLowerCase().includes(term) ||
        v.codelist?.toLowerCase().includes(term)
      );
    }
    
    // Apply core filter
    if (coreFilter !== 'all') {
      filtered = filtered.filter(v => v.core === coreFilter);
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aVal = a[sortConfig.key] || '';
      let bVal = b[sortConfig.key] || '';
      
      // Handle numeric order column
      if (sortConfig.key === 'order') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  };

  // Copy to clipboard function
  const copyToClipboard = (text, label = 'Copied!') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(label);
      setTimeout(() => setCopyFeedback(''), 2000);
    });
  };

  // Copy all variable names
  const copyAllVariableNames = () => {
    const names = getFilteredAndSortedVariables().map(v => v.name).join(', ');
    copyToClipboard(names, 'Variable names copied!');
  };

  // Fetch comparison domain
  const fetchCompareDomain = async (domain) => {
    if (!domain) {
      setCompareSpec(null);
      return;
    }
    
    try {
      const res = await axios.get(`${API_BASE}/api/spec/${domain}?version=${selectedVersion}`);
      setCompareSpec(res.data);
    } catch (err) {
      console.error('Failed to fetch comparison domain:', err);
      setCompareSpec(null);
    }
  };

  // Handle compare domain change
  useEffect(() => {
    if (compareMode && compareDomain) {
      fetchCompareDomain(compareDomain);
    }
  }, [compareDomain, compareMode, selectedVersion]);

  // Download spec as CSV
  const downloadSpecCSV = () => {
    if (!spec || !spec.variables) return;
    
    const headers = ['Order', 'Name', 'Label', 'Type', 'Length', 'Core', 'Role', 'Codelist', 'Description'];
    const rows = spec.variables.map(v => [
      v.order,
      v.name,
      `"${(v.label || '').replace(/"/g, '""')}"`,
      v.type,
      v.length || '',
      v.core,
      v.role || '',
      `"${(v.codelist || '').replace(/"/g, '""')}"`,
      `"${(v.description || '').replace(/"/g, '""')}"`
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spec.domain}_spec_v${selectedVersion}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download codelists as CSV
  const downloadCodelistsCSV = () => {
    if (!codelists || !codelists.codelists) return;
    
    const headers = ['Codelist_Code', 'Codelist_Name', 'Term_Code', 'Submission_Value', 'Preferred_Term', 'Definition'];
    const rows = [];
    
    codelists.codelists.forEach(cl => {
      (cl.terms || []).forEach(term => {
        rows.push([
          cl.codelist_code,
          `"${(cl.name || '').replace(/"/g, '""')}"`,
          term.code || '',
          `"${(term.submission_value || '').replace(/"/g, '""')}"`,
          `"${(term.preferred_term || '').replace(/"/g, '""')}"`,
          `"${(term.definition || '').replace(/"/g, '""')}"`
        ]);
      });
    });
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spec.domain}_codelists_ig${selectedVersion}_ct${selectedCtVersion}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download all specs as JSON
  const downloadAllSpecs = async () => {
    setLoadingAll(true);
    setError(null);
    
    try {
      const res = await axios.get(`${API_BASE}/api/spec/all?version=${selectedVersion}`);
      const data = res.data;
      
      if (data.domains_loaded === 0) {
        setError('No cached specs available. Please fetch individual domains first.');
        return;
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sdtm_all_specs_v${selectedVersion}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch all specifications');
    } finally {
      setLoadingAll(false);
    }
  };

  // Download all codelists as JSON
  const downloadAllCodelists = async () => {
    setLoadingAll(true);
    setError(null);
    
    try {
      const res = await axios.get(`${API_BASE}/api/codelists/all?version=${selectedVersion}&ct_version=${selectedCtVersion}`);
      const data = res.data;
      
      if (data.domains_loaded === 0) {
        setError('No cached codelists available. Please fetch individual domains first.');
        return;
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sdtm_all_codelists_ig${selectedVersion}_ct${selectedCtVersion}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch all codelists');
    } finally {
      setLoadingAll(false);
    }
  };

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      {/* Copy Feedback Toast */}
      {copyFeedback && (
        <div className="copy-toast">{copyFeedback}</div>
      )}

      {/* Header */}
      <header className="header">
        <div>
          <h1>📋 SDTM Spec Gen</h1>
          <p className="header-subtitle">Browse SDTMIG domain specifications and controlled terminology</p>
        </div>
        <div className="header-actions">
          <button 
            className={`btn btn-icon ${compareMode ? 'active' : ''}`}
            onClick={() => setCompareMode(!compareMode)}
            title="Compare Domains"
          >
            ⚖️ Compare
          </button>
          <button 
            className="btn btn-icon"
            onClick={() => setDarkMode(!darkMode)}
            title="Toggle Dark Mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="container">
        {/* Controls */}
        <div className="controls">
          <div className="control-group">
            <label>SDTMIG Version</label>
            <select 
              value={selectedVersion} 
              onChange={(e) => setSelectedVersion(e.target.value)}
            >
              {igVersions.map(v => (
                <option key={v} value={v}>SDTMIG {v}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>CT Version</label>
            <select 
              value={selectedCtVersion} 
              onChange={(e) => setSelectedCtVersion(e.target.value)}
            >
              {ctVersions.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Domain</label>
            <select 
              value={selectedDomain} 
              onChange={(e) => setSelectedDomain(e.target.value)}
            >
              <option value="">-- Select Domain --</option>
              {domains.map(d => (
                <option key={d.code} value={d.code}>{d.code} - {d.name}</option>
              ))}
            </select>
          </div>

          {/* Compare Domain Selector */}
          {compareMode && (
            <div className="control-group">
              <label>Compare With</label>
              <select 
                value={compareDomain} 
                onChange={(e) => setCompareDomain(e.target.value)}
              >
                <option value="">-- Select Domain --</option>
                {domains.filter(d => d.code !== selectedDomain).map(d => (
                  <option key={d.code} value={d.code}>{d.code} - {d.name}</option>
                ))}
              </select>
            </div>
          )}

          <button 
            className="btn btn-primary" 
            onClick={fetchSpec}
            disabled={!selectedDomain || loading}
          >
            {loading ? 'Loading...' : 'Get Specification'}
          </button>

          <div className="control-group" style={{ marginLeft: 'auto' }}>
            <label>Download All Cached</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={downloadAllSpecs}
                disabled={loadingAll}
                title="Download all cached domain specs as JSON"
              >
                {loadingAll ? '...' : '📦 All Specs'}
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={downloadAllCodelists}
                disabled={loadingAll}
                title="Download all cached codelists as JSON"
              >
                {loadingAll ? '...' : '📦 All Codelists'}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ color: 'var(--error)', marginBottom: '1rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p style={{ marginTop: '1rem' }}>Fetching specification...</p>
          </div>
        )}

        {/* Content */}
        {spec && !loading && (
          <>
            {/* Tabs */}
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'spec' ? 'active' : ''}`}
                onClick={() => setActiveTab('spec')}
              >
                Variables ({spec.total_variables})
              </button>
              <button 
                className={`tab ${activeTab === 'codelists' ? 'active' : ''}`}
                onClick={() => setActiveTab('codelists')}
              >
                Codelists ({codelists?.total_codelists || 0})
              </button>
              <button 
                className={`tab ${activeTab === 'json' ? 'active' : ''}`}
                onClick={() => setActiveTab('json')}
              >
                JSON View
              </button>
              
              {/* Download Buttons */}
              <div className="download-buttons">
                <button 
                  className="btn btn-download"
                  onClick={downloadSpecCSV}
                  title="Download specification as CSV"
                >
                  📥 Spec CSV
                </button>
                <button 
                  className="btn btn-download"
                  onClick={downloadCodelistsCSV}
                  title="Download codelists as CSV"
                >
                  📥 Codelists CSV
                </button>
              </div>
            </div>

            {/* Spec Tab */}
            {activeTab === 'spec' && (
              <div className="card">
                <div className="card-header">
                  <h2>{spec.domain} - {spec.label}</h2>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Class: {spec.class} | Version: {spec.ig_version}
                  </span>
                </div>

                <div className="stats">
                  <div 
                    className={`stat stat-clickable ${coreFilter === 'all' ? 'stat-active' : ''}`}
                    onClick={() => setCoreFilter('all')}
                    title="Show all variables"
                  >
                    <div className="stat-value">{spec.total_variables}</div>
                    <div className="stat-label">Total Variables</div>
                  </div>
                  <div 
                    className={`stat stat-clickable ${coreFilter === 'Req' ? 'stat-active' : ''}`}
                    onClick={() => setCoreFilter('Req')}
                    title="Filter: Required only"
                  >
                    <div className="stat-value" style={{ color: '#c62828' }}>
                      {spec.variable_summary?.required}
                    </div>
                    <div className="stat-label">Required</div>
                  </div>
                  <div 
                    className={`stat stat-clickable ${coreFilter === 'Exp' ? 'stat-active' : ''}`}
                    onClick={() => setCoreFilter('Exp')}
                    title="Filter: Expected only"
                  >
                    <div className="stat-value" style={{ color: '#e65100' }}>
                      {spec.variable_summary?.expected}
                    </div>
                    <div className="stat-label">Expected</div>
                  </div>
                  <div 
                    className={`stat stat-clickable ${coreFilter === 'Perm' ? 'stat-active' : ''}`}
                    onClick={() => setCoreFilter('Perm')}
                    title="Filter: Permissible only"
                  >
                    <div className="stat-value" style={{ color: '#2e7d32' }}>
                      {spec.variable_summary?.permissible}
                    </div>
                    <div className="stat-label">Permissible</div>
                  </div>

                  {/* Search Box */}
                  <div className="search-box" style={{ marginLeft: 'auto' }}>
                    <input 
                      type="text"
                      placeholder="🔍 Search variables..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                    <button 
                      className="btn btn-copy"
                      onClick={copyAllVariableNames}
                      title="Copy all variable names"
                    >
                      📋 Copy Names
                    </button>
                  </div>
                </div>

                {/* Active Filter Indicator */}
                {(coreFilter !== 'all' || searchTerm) && (
                  <div className="filter-indicator">
                    <span>
                      Showing <strong>{getFilteredAndSortedVariables().length}</strong> of {spec.total_variables} variables
                      {coreFilter !== 'all' && <span className="filter-tag">{coreFilter}</span>}
                      {searchTerm && <span className="filter-tag">"{searchTerm}"</span>}
                    </span>
                    <button 
                      onClick={() => { setCoreFilter('all'); setSearchTerm(''); }}
                      className="btn-clear-filter"
                    >
                      ✕ Clear All
                    </button>
                  </div>
                )}

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th className="sortable" onClick={() => handleSort('order')}>
                          #{getSortIndicator('order')}
                        </th>
                        <th className="sortable" onClick={() => handleSort('name')}>
                          Variable{getSortIndicator('name')}
                        </th>
                        <th className="sortable" onClick={() => handleSort('label')}>
                          Label{getSortIndicator('label')}
                        </th>
                        <th className="sortable" onClick={() => handleSort('type')}>
                          Type{getSortIndicator('type')}
                        </th>
                        <th className="sortable" onClick={() => handleSort('core')}>
                          Core{getSortIndicator('core')}
                        </th>
                        <th className="sortable" onClick={() => handleSort('role')}>
                          Role{getSortIndicator('role')}
                        </th>
                        <th>Codelist</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredAndSortedVariables().map((v, idx) => (
                        <tr key={idx} className={compareSpec?.variables?.find(cv => cv.name === v.name) ? '' : 'row-unique'}>
                          <td>{v.order}</td>
                          <td>
                            <strong>{v.name}</strong>
                            <button 
                              className="btn-copy-inline"
                              onClick={() => copyToClipboard(v.name, `${v.name} copied!`)}
                              title="Copy variable name"
                            >
                              📋
                            </button>
                          </td>
                          <td>{v.label}</td>
                          <td><span className={getTypeBadge(v.type)}>{v.type}</span></td>
                          <td><span className={getCoreBadge(v.core)}>{v.core}</span></td>
                          <td>{v.role}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {v.codelist_codes?.join(', ') || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Comparison View */}
                {compareMode && compareSpec && (
                  <div className="comparison-panel">
                    <h3>📊 Comparison: {spec.domain} vs {compareSpec.domain}</h3>
                    <div className="comparison-stats">
                      <div className="comparison-stat">
                        <span className="comparison-label">Only in {spec.domain}</span>
                        <span className="comparison-value green">
                          {spec.variables?.filter(v => !compareSpec.variables?.find(cv => cv.name === v.name)).length}
                        </span>
                      </div>
                      <div className="comparison-stat">
                        <span className="comparison-label">Common</span>
                        <span className="comparison-value blue">
                          {spec.variables?.filter(v => compareSpec.variables?.find(cv => cv.name === v.name)).length}
                        </span>
                      </div>
                      <div className="comparison-stat">
                        <span className="comparison-label">Only in {compareSpec.domain}</span>
                        <span className="comparison-value red">
                          {compareSpec.variables?.filter(v => !spec.variables?.find(sv => sv.name === v.name)).length}
                        </span>
                      </div>
                    </div>
                    <div className="comparison-lists">
                      <div className="comparison-column green-bg">
                        <h4>✅ Only in {spec.domain}</h4>
                        <ul>
                          {spec.variables?.filter(v => !compareSpec.variables?.find(cv => cv.name === v.name)).map(v => (
                            <li key={v.name}><strong>{v.name}</strong> - {v.label}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="comparison-column red-bg">
                        <h4>❌ Only in {compareSpec.domain}</h4>
                        <ul>
                          {compareSpec.variables?.filter(v => !spec.variables?.find(sv => sv.name === v.name)).map(v => (
                            <li key={v.name}><strong>{v.name}</strong> - {v.label}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Codelists Tab */}
            {activeTab === 'codelists' && (
              <div className="card">
                <div className="card-header">
                  <h2>Controlled Terminology for {spec.domain}</h2>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {codelists?.total_codelists} codelists | CT Version: {codelists?.ct_version}
                  </span>
                </div>
                <div className="card-body">
                  {codelists?.codelists?.map((cl, idx) => (
                    <div key={idx} className="codelist-item">
                      <div 
                        className="codelist-header"
                        onClick={() => setExpandedCodelist(
                          expandedCodelist === cl.codelist_code ? null : cl.codelist_code
                        )}
                      >
                        <div>
                          <span className="codelist-title">{cl.name}</span>
                          <span className="codelist-code" style={{ marginLeft: '1rem' }}>
                            {cl.codelist_code}
                          </span>
                        </div>
                        <span>
                          {cl.total_terms} terms 
                          {expandedCodelist === cl.codelist_code ? ' ▼' : ' ▶'}
                        </span>
                      </div>
                      
                      {expandedCodelist === cl.codelist_code && (
                        <div className="codelist-terms">
                          <table>
                            <thead>
                              <tr>
                                <th>Code</th>
                                <th>Submission Value</th>
                                <th>Preferred Term</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cl.terms?.slice(0, 50).map((term, tidx) => (
                                <tr key={tidx}>
                                  <td style={{ fontFamily: 'monospace' }}>{term.code}</td>
                                  <td><strong>{term.submission_value}</strong></td>
                                  <td>{term.preferred_term}</td>
                                </tr>
                              ))}
                              {cl.terms?.length > 50 && (
                                <tr>
                                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    ... and {cl.terms.length - 50} more terms
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* JSON Tab */}
            {activeTab === 'json' && (
              <div className="card">
                <div className="card-header">
                  <h2>JSON Data (for AI/Backend)</h2>
                  <div>
                    <button 
                      className="btn btn-primary"
                      style={{ marginRight: '0.5rem' }}
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${spec.domain.toLowerCase()}_spec.json`;
                        a.click();
                      }}
                    >
                      Download Spec JSON
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(codelists, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${spec.domain.toLowerCase()}_codelists.json`;
                        a.click();
                      }}
                    >
                      Download Codelists JSON
                    </button>
                  </div>
                </div>
                <div className="card-body" style={{ padding: '1rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ marginBottom: '0.5rem' }}>Spec JSON:</h4>
                    <pre style={{ 
                      background: '#f5f5f5', 
                      padding: '1rem', 
                      borderRadius: '4px',
                      maxHeight: '300px',
                      overflow: 'auto',
                      fontSize: '0.75rem'
                    }}>
                      {JSON.stringify(spec, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 style={{ marginBottom: '0.5rem' }}>Codelists JSON:</h4>
                    <pre style={{ 
                      background: '#f5f5f5', 
                      padding: '1rem', 
                      borderRadius: '4px',
                      maxHeight: '300px',
                      overflow: 'auto',
                      fontSize: '0.75rem'
                    }}>
                      {JSON.stringify(codelists, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!spec && !loading && (
          <div className="card">
            <div className="empty-state">
              <h3>Select a Domain</h3>
              <p>Choose an SDTMIG version and domain to view its specification</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
