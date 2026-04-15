[![codecov](https://codecov.io/gh/madunasibonelo111/the_campus_marketplace/graph/badge.svg?token=BGZUWE6M8Z)](https://codecov.io/gh/madunasibonelo111/the_campus_marketplace)

# The Campus Marketplace — Full-Stack Student Trade & Commerce Platform

Built as part of the 2026 Software Design Project at the University of the Witwatersrand. 
Developed using **Agile Scrum methodology** to provide a secure, localized commerce hub for students.

## 🚀 Live Deployment
* **Production App URL:** [https://campus-market-live-d4afewc6edeya9gn.uaenorth-01.azurewebsites.net/]
* **GitHub Repository:** [https://github.com/madunasibonelo111/the_campus_marketplace]

## 📖 About the Project
The Campus Marketplace is a full-featured web platform designed to facilitate the buying, selling, and trading of goods specifically within a university campus environment. 

### Project Goals
* Facilitate secure and easy peer-to-peer trade between students.
* Provide a specialized "Price Suggestion" engine using real-time market data.
* **TDD Excellence:** Maintain a minimum of **50% line coverage** using a robust CI/CD pipeline.

## 🛠️ Technology Stack
| Area | Tech Used |
| :--- | :--- |
| **Frontend** | React (Vite) |
| **Hosting** | Azure App Service (Linux) |
| **BaaS** | Supabase (Auth & DB) |
| **Testing** | **Vitest** |
| **Coverage** | **Istanbul** |
| **CI/CD** | GitHub Actions & **Codecov** |

## 🧪 Testing & Quality Assurance
We utilize **Vitest** as our primary testing framework, integrated with the **Istanbul** coverage provider for high-precision line tracking.

### **Why Vitest & Istanbul?**
* **Vitest:** A next-generation testing tool built for Vite. It provides lightning-fast execution and a "watch mode" that allows for real-time TDD.
* **Istanbul:** Unlike standard tools, Istanbul tracks every branch and line in our React components, ensuring that our **50% coverage goal** is backed by accurate data.
* **Codecov:** Automatically analyzes our test reports during Pull Requests to prevent "coverage regression."

### **Commands**
* `npm test`: Runs Vitest in watch mode.
* `npm run coverage`: Generates the Istanbul coverage report.

## 🏗️ Repository Architecture
The project follows a **Component-Colocated Design**.

src/
├── 📁 components/      # Reusable UI fragments (Auth forms, Navigation)
├── 📁 pages/           # Module-based views (Colocated with Logic and Tests)
│   ├── 📁 Auth/        # Login/Register logic
│   ├── 📁 Browse/      # Product discovery
│   ├── 📁 Messaging/   # Real-time negotiation (Sprint 2)
│   ├── 📁 Payments/    # Transaction logic (Sprint 2)
│   ├── 📁 Posting/     # Listing creation & Price Logic
│   └── 📁 Profile/     # History & Ratings (Sprint 2)
├── 📁 supabase/        # Database client configuration
