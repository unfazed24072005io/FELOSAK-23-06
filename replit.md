# Feloosak: Your Cash Book for Business & Personal Finance Management

## Overview
Feloosak is a comprehensive cash book application specifically designed for Egyptian Small & Medium Enterprises (SMEs), also suitable for personal finance management. It aims to simplify financial tracking by offering features like multi-cash book management (local and cloud-synced), team collaboration, SMS transaction parsing, professional invoice generation, and a digital storefront. The application is tailored for the Egyptian market, utilizing EGP currency formatting and supporting both Arabic and English languages, with a vision to empower businesses with efficient financial tools.

## User Preferences
I prefer clear, concise explanations and direct answers. For development, I favor an iterative approach with frequent, small commits. Please ask for confirmation before implementing major architectural changes or deleting significant portions of code. I prefer receiving detailed explanations for complex solutions. Do not make changes to files related to deployment configurations without explicit instruction.

## System Architecture

### Multi-Book Design
The application supports multiple cash books per user. Local books are stored on-device using AsyncStorage for offline access, while cloud books are synced to a PostgreSQL database via an Express API, enabling team collaboration and data sharing.

### Backend
The backend is built with Express.js (TypeScript) and uses session-based authentication. PostgreSQL is the primary database, managed with Drizzle ORM. It provides a full REST API for managing books, transactions, debts, products, members, business profiles, and invoices. Role-based access control (owner, editor, viewer) is implemented for cloud books.

### Frontend
The frontend is developed using Expo React Native, leveraging Expo Router for file-based routing. It supports multi-language capabilities with a custom `LanguageContext` for Arabic and English, including RTL layout support. UI design prioritizes a dark theme (Navy with blue accents) and a light theme, using the Inter font and `expo-vector-icons`.

### Core Features
- **Cash Book Management**: Income/expense tracking with categories, EGP formatting, various payment modes, and attachment support.
- **SMS Reader**: Parses bank/payment SMS for quick transaction entry.
- **Invoice Generation**: Creates professional, branded PDF invoices with status tracking for cloud books.
- **Business Profile**: Customizable profiles per book for branding on invoices and other documents.
- **Payment Reminders**: Facilitates sending reminders via WhatsApp, SMS, or Email for outstanding debts.
- **Team Collaboration**: Role-based access control for cloud books (owner, editor, viewer).
- **Digital Storefront**: Product catalog management and a public storefront URL for sharing.
- **Reporting**: Generates Excel (CSV) and PDF reports with various filters.
- **AR/AP Tracker**: Manages debtors and creditors with due dates and one-tap settlement.

## External Dependencies
- **PostgreSQL**: Primary database for cloud-synced data.
- **AsyncStorage**: Local storage solution for offline cash books.
- **@expo/vector-icons**: For consistent iconography across the application.
- **expo-haptics**: For haptic feedback interactions.
- **expo-print**: Used for generating PDF documents like invoices and reports.
- **expo-sharing**: For sharing generated PDFs and other files.
- **crypto.scryptSync**: For password hashing.