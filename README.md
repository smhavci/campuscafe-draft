# CampusCafe - Smart Dining Management System

## Project Overview
**CampusCafe** is a functional web application designed to optimize coffee and food ordering within a campus environment. It provides a seamless interface for students to order meals and a robust dashboard for cafe owners to manage their business.

This project is submitted as part of **Homework 2: Website Development & AI Agent Planning**.

## Core Features
- **Real-time Menu:** Browse categories and products available at the campus cafe.
- **Order Tracking:** Place orders and monitor their status (Pending, Completed, etc.).
- **User Loyalty System:** Earn and track points.
- **Admin Dashboard:** Comprehensive sales analytics and order management for owners.
- **Campaign Management:** View and create specialized cafe promotions.

## AI Agent Integration Plan
As part of the future development phase, an AI-agent layer will be integrated to transform CampusCafe into a proactive system (Budget assistants, Predictive ordering, and Inventory advisors).

[**Click here to view the AI Agent Planning Document**](./docs/ai_agent_planning.md)

---

## Setup & Run Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Angular CLI](https://angular.io/cli) (v17+)

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
   *The backend will run on `http://localhost:3000`.*

### Frontend Setup
1. Navigate to the `frontend/campuscafe-ui` directory:
   ```bash
   cd frontend/campuscafe-ui
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the application:
   ```bash
   npx ng serve
   ```
   *The website will be accessible at `http://localhost:4200`.*

---

## Technologies Used
- **Frontend:** Angular, RxJS, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Data:** In-memory JS data store (with init scripts)
- **Documentation:** Markdown, Mermaid.js
