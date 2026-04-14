# The Campus Marketplace — Full-Stack Student Trade & Commerce Platform

Built as part of the 2026 Software Design Project at the University of the Witwatersrand.  
Developed using **Agile Scrum methodology** to provide a secure, localized commerce hub for students.

---

## 🚀 Live Deployment

**Production App URL:** [https://campus-market-live-d4afewc6edeya9gn.uaenorth-01.azurewebsites.net/]

**GitHub Repository:** [https://github.com/madunasibonelo111/the_campus_marketplace]

---

## 📖 About the Project

**The Campus Marketplace** is a full-featured web platform designed to facilitate the buying, selling, and trading of goods specifically within a university campus environment. Students can list textbooks, electronics, and clothing while receiving real-time price suggestions based on market trends and item conditions.

This project was developed from scratch, applying **Scrum methodology** with iterative planning, daily stand-ups, and regular sprint reviews to ensure high-quality software delivery.

### **Project Goals**
* Facilitate secure and easy peer-to-peer trade between students.
* Provide a specialized "Price Suggestion" engine using real-time market data and condition multipliers.
* Implement a robust, modular architecture for high maintainability.
* Demonstrate competency in modern full-stack development using **React**, **Vite**, and **Supabase**.

---

## ✨ Features

### **For Buyers**
* **Secure Authentication:** Register and login with campus-verified roles (Student, Staff).
* **Dynamic Marketplace:** Browse and filter listings by category (Electronics, Textbooks, Clothing).
* **Smart Search:** Instantly find specific items with a real-time search interface.
* **Shopping Basket:** Manage potential purchases with a localized persistent cart system.

### **For Sellers**
* **Streamlined Posting:** Create listings with titles, descriptions, and multiple image uploads.
* **AI Price Suggestion:** Receive automated price estimates based on item category, keywords, and condition (New, Good, Fair, etc.).
* **Flexible Listing Types:** Choose between selling for cash or trading/swapping items.

---

## 🛠️ Technology Stack

| Area | Tech Used |
| :--- | :--- |
| **Frontend** | React (Vite) |
| **Hosting** | Azure App Service (Linux) |
| **Backend-as-a-Service** | Supabase |
| **Database** | PostgreSQL (Supabase) |
| **Authentication** | Supabase Auth |
| **Testing** | Jest |
| **CI/CD** | GitHub Actions |
| **Code Coverage** | Codecov |

---

## 🏗️ Repository Architecture

The project follows a **Component-Colocated Design**. This ensures that every feature is a self-contained module including its logic, styles, and unit tests.

```text
src/
├── 📁 components/      # Reusable UI fragments (Auth forms, Navigation)
├── 📁 pages/           # Full-screen views (Colocated with CSS and Tests)
│   ├── 📁 Basket/      # Shopping grid and cart logic
│   ├── 📁 Home/        # Landing page and "How it Works"
│   └── 📁 Posting/     # Create Listing form and Price Logic
├── 📁 supabase/        # Database client and backend configuration
├── 📄 App.jsx          # Root routing and application logic
└── 📄 main.jsx         # Entry point
