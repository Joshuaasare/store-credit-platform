Project Brief: Store Credit App for Ghana

1. What Are We Building?
   We are building a mobile app system for small shops in Ghana. Shops use it to give "store credit" (loyalty points) to their customers. Customers use their phone number to save up this credit and spend it later at the shop.

2. How It Works (Simple Flow)
   The Customer: Does not need an app. They just buy items, pay in cash, and tell the cashier their phone number. The credit saves automatically to their phone number. Users can also download a separate app to check their credit balance across different shops.
   The Cashier: Opens the Merchant App, types the customer's phone number and the amount they paid. The app calculates the credit and saves it.
   The Customer App: Optional. Customers can download a separate app just to look at how much credit they have saved across different shops.
3. The 4 Strict Rules (CRITICAL)
   Cashiers might try to steal by giving fake credits to their friends. To stop this, the code MUST enforce these 4 rules:

Auto-Calculate Only: The cashier can only type the "Amount Paid". The system must calculate the credit (e.g., 2% of the amount). The cashier must NEVER be able to type the credit amount directly.
Pool Limit: The shop owner sets a maximum credit limit (e.g., GH₵100). When the shop has given out GH₵100 in credit, the app must stop allowing new credits.
24-Hour Delay: When a customer gets credit, it goes into a "pending" state. It must stay pending for a while before they can spend it. This period is configurable and set by the shop owner (e.g., 24 hours). The customer cannot spend their credit until this period is over.
20% Spend Limit: When a customer wants to use their credit, they can only use it for 20% of their new purchase. (Example: If they buy a GH₵100 item, they can only use GH₵20 of credit. They must pay the remaining GH₵80 in cash). 4. Tech Stack
Monorepo: nx
Backend: Fastify (Node.js + TypeScript)
Database & Auth: Supabase
Mobile Apps: React Native (Expo)
Validation: Zod (Shared between frontend and backend) 5. Folder Structure
store-credit-app/
├── apps/
│ ├── main-backend/ # Fastify Backend
│ ├── main-webapp/ # Web app for Shop Owners/Cashiers/Customers
│ └── customer-app/ # React Native App for Customers to check balances
├── packages/
│ └── shared/ # Shared TypeScript types and Zod validation schemas
└── PROJECT_BRIEF.md # This file 6. Database Tables (Supabase)

I want us to implement a robust database plan and schema that can handle both the current requirements and future scalability. For with shops, i think we would want to distinguish the various branches of the shops. So we will have a store table, a branch table,We would also like to have a staff table, to house all the staff in a particular store. We then need a role table, which is primarily for granting role based access to specific staff members. Roles can be manager, cashier etc. In end, the idea is that this can turn into a inventory managment system, but we'll start with the bulk of the crediting system for now.

I've created below a simple idea of some of the db, but what we'll create should be far more robust and scalable than whats below.
profiles: Stores user info.
id (uuid), phone_number (text), role (text: 'owner', 'cashier', 'customer')
shops: Stores shop settings.
id (uuid), name (text), credit_rate (numeric, e.g., 0.02 for 2%), redemption_cap (numeric, e.g., 0.20 for 20%), active_pool_amount (numeric)
wallets: Stores customer balances for each shop.
id (uuid), customer_phone (text), shop_id (uuid), spendable_balance (numeric), pending_balance (numeric)
transactions: Records every time credit is given or used.
id (uuid), wallet_id (uuid), type (text: 'issue' or 'redeem'), amount (numeric), status (text: 'pending' or 'spendable'), created_at (timestamp) 7. Backend API Endpoints (Fastify)
POST /api/credit/issue
Input: customer_phone, amount_paid
Logic: Check if shop pool is > 0. Multiply amount_paid by credit_rate. Add result to wallet's pending_balance. Subtract from shop's active_pool_amount. Save transaction as 'pending'.
POST /api/credit/redeem
Input: customer_phone, total_purchase_amount
Logic: Find wallet. Calculate max_credit = total_purchase_amount \* 0.20. Subtract the smaller of spendable_balance or max_credit from the wallet. Save transaction as 'redeemed'.
GET /api/wallet/balance
Input: customer_phone
Logic: Return a list of all shops and their balances linked to that phone number.
