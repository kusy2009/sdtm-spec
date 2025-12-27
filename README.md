# 📋 SDTM Spec Gen# SDTM Spec Service



A modern web application for browsing, searching, and exporting SDTM Implementation Guide (SDTMIG) specifications with React frontend and Flask backend.A web application for browsing SDTM Implementation Guide specifications with React frontend and Flask backend.



![SDTM Spec Gen](https://img.shields.io/badge/SDTM-Spec%20Gen-blue)## Features

![Python](https://img.shields.io/badge/Python-3.8+-green)

![React](https://img.shields.io/badge/React-18-blue)- **Domain Specification Browser**: View all variables for any SDTM domain

![License](https://img.shields.io/badge/License-MIT-yellow)- **Codelist Viewer**: View only the codelists relevant to the selected domain

- **Version Selection**: Choose from available SDTMIG versions (default: 3-4)

## ✨ Features- **JSON Export**: Download spec and codelists as JSON for AI/backend use

- **Caching**: API responses are cached to avoid repeated CDISC Library calls

### Core Features- **Separate Files**: Spec and codelists saved as separate JSON files

- **🔍 Domain Specification Browser**: View all variables for any SDTM domain

- **📚 Codelist Viewer**: View controlled terminology relevant to selected domain## Architecture

- **📦 Bulk Export**: Download all cached specs/codelists as JSON

- **💾 Caching**: API responses cached to avoid repeated CDISC Library calls```

┌─────────────────────────────────────────────────────────────────┐

### New Features│                        React Frontend                            │

- **🔎 Variable Search**: Filter variables by name, label, or codelist│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │

- **📋 Copy to Clipboard**: One-click copy for variable names│  │   Domain    │  │  Variables  │  │  Codelists  │              │

- **🌙 Dark Mode**: Toggle between light and dark themes│  │  Selector   │  │    Table    │  │  Accordion  │              │

- **⚖️ Domain Comparison**: Compare variables between two domains side-by-side│  └─────────────┘  └─────────────┘  └─────────────┘              │

- **🎯 Filter by Core**: Quick filter by Required/Expected/Permissible└─────────────────────────────────────────────────────────────────┘

- **🔄 Sortable Columns**: Click headers to sort by any column                              │

                              ▼

## 🏗️ Architecture┌─────────────────────────────────────────────────────────────────┐

│                        Flask API                                 │

```│  /api/versions  /api/domains  /api/spec  /api/codelists         │

┌─────────────────────────────────────────────────────────────────┐└─────────────────────────────────────────────────────────────────┘

│                        React Frontend                            │                              │

│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │                              ▼

│  │  Search  │  │  Filter  │  │  Compare │  │   Dark   │        │┌─────────────────────────────────────────────────────────────────┐

│  │   Box    │  │  Stats   │  │   Mode   │  │   Mode   │        ││                   SDTMSpecServiceV2                              │

│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        ││  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │

└─────────────────────────────────────────────────────────────────┘│  │   Memory    │  │    Disk     │  │   Output    │              │

                              ││  │   Cache     │  │   Cache     │  │   Files     │              │

                              ▼│  └─────────────┘  └─────────────┘  └─────────────┘              │

┌─────────────────────────────────────────────────────────────────┐└─────────────────────────────────────────────────────────────────┘

│                        Flask API                                 │                              │

│  /api/versions  /api/domains  /api/spec  /api/codelists         │                              ▼

│  /api/spec/all  /api/codelists/all  /api/cache/stats            │┌─────────────────────────────────────────────────────────────────┐

└─────────────────────────────────────────────────────────────────┘│                   CDISC Library API                              │

                              ││              https://library.cdisc.org/api                       │

                              ▼└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐```

│                   SDTMSpecServiceV2                              │

│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │## Output Files

│  │   Memory    │  │    Disk     │  │   Output    │              │

│  │   Cache     │  │   Cache     │  │   Files     │              │When you fetch a domain spec, two JSON files are created:

│  └─────────────┘  └─────────────┘  └─────────────┘              │

└─────────────────────────────────────────────────────────────────┘```

                              │output/

                              ▼├── vs/

┌─────────────────────────────────────────────────────────────────┐│   ├── vs_spec_v3-4.json      # Domain specification

│                   CDISC Library API                              ││   └── vs_codelists_v3-4.json # Related codelists only

│              https://library.cdisc.org/api                       │├── lb/

└─────────────────────────────────────────────────────────────────┘│   ├── lb_spec_v3-4.json

```│   └── lb_codelists_v3-4.json

└── ...

## 🚀 Quick Start```



### Prerequisites### Spec JSON Structure

- Python 3.8+```json

- Node.js 16+ (for frontend development only){

- CDISC Library API Key ([Get one here](https://www.cdisc.org/cdisc-library))  "domain": "VS",

  "label": "Vital Signs",

### Installation  "class": "Findings",

  "ig_version": "3-4",

1. **Clone the repository**  "total_variables": 38,

```bash  "variables": [

git clone https://github.com/kusy2009/sdtm-spec.git    {

cd sdtm-spec      "order": "1",

```      "name": "STUDYID",

      "label": "Study Identifier",

2. **Set up environment variables**      "type": "Char",

```bash      "core": "Req",

cp .env.example .env      "role": "Identifier",

# Edit .env and add your CDISC_API_KEY      "codelist": null,

```      "codelist_codes": []

    },

3. **Create and activate virtual environment**    ...

```bash  ],

python -m venv .venv  "variable_summary": {

    "required": 6,

# Windows    "expected": 8,

.venv\Scripts\activate    "permissible": 24

  },

# Linux/Mac  "codelist_codes_used": ["C66741", "C67153", "C66770", ...]

source .venv/bin/activate}

``````



4. **Install Python dependencies**### Codelists JSON Structure

```bash```json

pip install -r requirements.txt{

```  "domain": "VS",

  "ct_version": "2024-09-27",

5. **Run the application**  "total_codelists": 5,

```bash  "codelists": [

python api.py    {

```      "codelist_code": "C66741",

      "name": "Vital Signs Test Code",

6. **Open in browser**      "total_terms": 75,

```      "terms": [

http://localhost:5050        {

```          "code": "C25299",

          "submission_value": "DIABP",

## 📁 Project Structure          "preferred_term": "Diastolic Blood Pressure"

        },

```        ...

sdtm-spec/      ]

├── api.py                 # Flask API server    }

├── sdtm_spec_v2.py        # Core SDTM service  ]

├── requirements.txt       # Python dependencies}

├── .env.example           # Environment template```

├── Procfile               # Heroku/Render deployment

├── runtime.txt            # Python version for deployment## Quick Start

├── frontend/

│   ├── src/### Option 1: Run Flask API only

│   │   ├── App.js         # Main React component```bash

│   │   └── index.css      # Styles (includes dark mode)cd sdtm_spec_service

│   ├── build/             # Production build (served by Flask)pip install -r requirements.txt

│   └── package.json       # Node dependenciespython3 api.py

├── cache/                 # API response cache (gitignored)```

└── output/                # Saved spec/codelist files

    ├── vs/### Option 2: Use the startup script

    │   ├── vs_spec_v3-4.json```bash

    │   └── vs_codelists_ig3-4_ct2025-09-26.jsonchmod +x start.sh

    └── ..../start.sh

``````



## 🔌 API Endpoints### Option 3: Full React + Flask

```bash

| Method | Endpoint | Description |# Terminal 1: Start Flask API

|--------|----------|-------------|cd sdtm_spec_service

| GET | `/api/versions` | Get available SDTMIG and CT versions |python3 api.py

| GET | `/api/domains?version=3-4` | Get all domains for a version |

| GET | `/api/spec/<domain>?version=3-4` | Get domain specification |# Terminal 2: Start React frontend

| GET | `/api/spec/all?version=3-4` | Get all cached domain specs |cd sdtm_spec_service/frontend

| GET | `/api/codelists/<domain>?version=3-4` | Get domain codelists |npm install

| GET | `/api/codelists/all?version=3-4` | Get all cached codelists |npm start

| POST | `/api/fetch/<domain>` | Fetch and save spec + codelists |```

| GET | `/api/saved` | List saved domain specs |

| GET | `/api/cache/stats` | Get cache statistics |## API Endpoints

| POST | `/api/cache/clear` | Clear cache |

| GET | `/api/health` | Health check || Method | Endpoint | Description |

|--------|----------|-------------|

## 📤 Output Files| GET | `/api/versions` | Get available SDTMIG versions |

| GET | `/api/domains?version=3-4` | Get all domains for a version |

When you fetch a domain spec, two JSON files are created:| GET | `/api/spec/<domain>?version=3-4` | Get domain specification |

| GET | `/api/codelists/<domain>?version=3-4` | Get domain codelists |

### Spec JSON (`output/vs/vs_spec_v3-4.json`)| POST | `/api/fetch/<domain>` | Fetch and save spec + codelists |

```json| GET | `/api/saved` | List saved domain specs |

{| GET | `/api/cache/stats` | Get cache statistics |

  "domain": "VS",| POST | `/api/cache/clear` | Clear cache |

  "label": "Vital Signs",

  "class": "Findings",## Python API Usage

  "ig_version": "3-4",

  "total_variables": 38,```python

  "variables": [from sdtm_spec_v2 import SDTMSpecServiceV2

    {

      "order": "1",service = SDTMSpecServiceV2()

      "name": "STUDYID",

      "label": "Study Identifier",# Fetch domain spec and related codelists (saves to files)

      "type": "Char",spec, codelists = service.get_domain_spec_and_codelists("VS")

      "core": "Req",

      "role": "Identifier",# Load saved spec

      "codelist": nullspec = service.load_spec("VS", version="3-4")

    }codelists = service.load_codelists("VS", version="3-4")

  ],

  "variable_summary": {# List all saved specs

    "required": 6,saved = service.get_saved_specs()

    "expected": 8,```

    "permissible": 24

  }## CLI Usage

}

``````bash

# Fetch VS domain spec and codelists

### Codelists JSON (`output/vs/vs_codelists_ig3-4_ct2025-09-26.json`)python3 sdtm_spec_v2.py fetch --domain VS

```json

{# List all domains

  "domain": "VS",python3 sdtm_spec_v2.py domains

  "ct_version": "2025-09-26",

  "total_codelists": 5,# List saved specs

  "codelists": [python3 sdtm_spec_v2.py list

    {

      "codelist_code": "C66741",# Clear cache

      "name": "Vital Signs Test Code",python3 sdtm_spec_v2.py cache --clear

      "total_terms": 75,```

      "terms": [

        {## Configuration

          "code": "C25299",

          "submission_value": "DIABP",Environment variables (optional):

          "preferred_term": "Diastolic Blood Pressure"- `CDISC_API_KEY`: Your CDISC Library API key

        }- `PORT`: Flask API port (default: 5000)

      ]- `DEBUG`: Enable debug mode (default: true)

    }
  ]
}
```

## 🐍 Python API Usage

```python
from sdtm_spec_v2 import SDTMSpecServiceV2

service = SDTMSpecServiceV2()

# Fetch domain spec and related codelists (saves to files)
spec, codelists = service.get_domain_spec_and_codelists("VS")

# Load saved spec
spec = service.load_spec("VS", version="3-4")
codelists = service.load_codelists("VS", version="3-4")

# List all saved specs
saved = service.get_saved_specs()
```

## 🖥️ CLI Usage

```bash
# Fetch VS domain spec and codelists
python sdtm_spec_v2.py fetch --domain VS

# List all domains
python sdtm_spec_v2.py domains

# List saved specs
python sdtm_spec_v2.py list

# Clear cache
python sdtm_spec_v2.py cache --clear
```

## 🚀 Deployment

### Render (Recommended - Free tier available)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn api:app`
5. Add Environment Variable: `CDISC_API_KEY`
6. Deploy!

### Railway

1. Push to GitHub
2. Go to [railway.app](https://railway.app)
3. New Project → Deploy from GitHub
4. Add `CDISC_API_KEY` environment variable

### Docker

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5050
CMD ["gunicorn", "api:app", "-b", "0.0.0.0:5050"]
```

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CDISC_API_KEY` | Your CDISC Library API key | **Required** |
| `PORT` | Server port | 5050 |
| `DEBUG` | Enable debug mode | true |

## 🛠️ Development

### Frontend Development

```bash
cd frontend
npm install
npm start
```

This starts React dev server on `http://localhost:3000` with hot reload.

### Backend Development

```bash
python api.py
```

Flask runs with debug mode and auto-reload.

### Building Frontend

```bash
cd frontend
npm run build
```

Production build is created in `frontend/build/` and served by Flask.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [CDISC](https://www.cdisc.org/) for the CDISC Library API
- [Flask](https://flask.palletsprojects.com/) for the backend framework
- [React](https://reactjs.org/) for the frontend framework

---

**Made with ❤️ for the clinical data standards community**
