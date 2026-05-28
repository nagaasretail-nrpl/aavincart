# Aavin Cart - Professional Demo Walkthrough Script
## Tamil Nadu Cooperative Milk Producers' Federation (TCMPF) Distribution Management System

**Total Duration: Under 5 Minutes**
**Video Clips Location: `/videos/` folder (6 cinematic clips for transitions)**

---

## VIDEO CLIP ORDER & TIMING

| # | Clip | File | Duration | Purpose |
|---|------|------|----------|---------|
| 1 | Intro & Branding | `01-intro-branding.mp4` | 8s | Opening - Federation heritage |
| 2 | Dairy Farm | `02-dairy-farm.mp4` | 8s | Milk collection from 3.85L farmers |
| 3 | E-Commerce | `03-ecommerce-ordering.mp4` | 8s | Digital ordering platform |
| 4 | 3-Segment Workflow | `04-segment-workflow.mp4` | 8s | Fresh Milk / Products / Ice Cream |
| 5 | Delivery Logistics | `05-delivery-logistics.mp4` | 8s | GPS tracking & route optimization |
| 6 | Tech Dashboard | `06-tech-dashboard.mp4` | 8s | Analytics & compliance |

---

## DEMO SCRIPT

### OPENING (0:00 - 0:30)

**[PLAY: 01-intro-branding.mp4]**

> "Aavin Cart is a comprehensive Distribution Management System built for the Tamil Nadu Cooperative Milk Producers' Federation - one of India's largest dairy cooperatives, procuring milk from over 3.85 lakh farmers across 31 District Unions."

**[PLAY: 02-dairy-farm.mp4]**

> "From farm to doorstep, Aavin Cart digitizes the entire supply chain - ordering, processing, delivery, and compliance."

---

### SECTION 1: ADMIN PANEL (0:30 - 1:15)

**Login Credentials:** `admin@aavin.in` / `admin123`
**URL:** `/admin/login` (then navigate to `/admin/dashboard`)

**Screen Recording Points:**

1. **Dashboard Overview** - Show the admin dashboard with key metrics
   - Total orders, revenue, active unions, registered users
   - Quick action buttons

2. **Master Product Catalog** (`/admin/master-catalog`)
   - Show 18 products across 3 segments: Fresh Milk (6), Products (6), Ice Cream (6)
   - Highlight **6-tier pricing**: Federation, Inter-Union, Wholesale Dealer, Dealer, Retailer, MRP
   - Show HSN codes and GST rates (0% milk, 5% curd/buttermilk, 12% ghee/butter, 18% ice cream)
   - Show B2B case packaging: cartons, boxes, trays with units-per-package

3. **District Unions Management** (`/admin/district-unions`)
   - Show all 31 District Unions across Tamil Nadu
   - Union codes: CBE, MDU, SLM, TRY, ERO, etc.
   - Each union operates as an independent merchant portal

4. **User Management** (`/admin/users`)
   - B2B roles: Wholesale Dealers, Dealers, Retailers, Institutions
   - Approval workflow: Pending -> Approved/Rejected
   - GST/FSSAI compliance verification

> "The Admin Panel provides federation-level oversight across all 31 District Unions - from product catalogs with role-based pricing to user approvals and compliance management."

---

### SECTION 2: 3-SEGMENT ORDER WORKFLOW (1:15 - 2:00)

**[PLAY: 04-segment-workflow.mp4]**

**Exclusive Feature Highlight:**

> "What makes Aavin Cart unique is its 3-segment order processing pipeline. Every B2B order is automatically split into three segments - Fresh Milk, Products, and Ice Cream - each with dedicated teams for marketing, production, and delivery."

**Screen Recording Points:**

5. **B2B Order Splitting** - Show an order with items across segments
   - Master order -> 3 sub-orders (FM-suffix, PR-suffix, IC-suffix)
   - Each sub-order follows independent workflow

6. **8-Stage Workflow Pipeline**
   - Show orders at different stages:
     - Pending (new order placed)
     - Marketing Approved (sales team confirmation)
     - Production Approved (manufacturing cleared)
     - Packing Approved (ready for dispatch)
     - Assigned to Delivery (driver auto-assigned)
     - Out for Delivery (en route)
     - Delivered (receipt confirmed)
     - Customer Acknowledged (final confirmation)

---

### SECTION 3: MERCHANT/UNION PORTAL (2:00 - 2:45)

**Login:** Username: `cbe` / Password: `Union@123` (Coimbatore Union)
**URL:** `/district-union/login` (then redirects to `/merchant/dashboard`)

**Screen Recording Points:**

7. **Union Dashboard**
   - Today's order summary, revenue, pending tasks
   - Staff management and segment assignment

8. **Order Management**
   - View incoming orders with segment tags
   - Approve/reject with one click
   - Invoice generation with union-specific numbering: `CBE/2526/00001`

9. **GST-Compliant Invoicing** (Exclusive Feature)
   - Show invoice with proper HSN codes, CGST/SGST breakdowns
   - Union-specific sequential numbering using PostgreSQL atomic counters
   - Format: `UNION_CODE/FY/SEQ` (e.g., `SLM/2526/00001`)

> "Each District Union operates independently with its own portal, staff, and invoice sequence - while the Federation has complete visibility across all operations."

---

### SECTION 4: PWA STAFF APP (2:45 - 3:30)

**Login:** `teststore` / `admin123`
**URL:** `/pwa/staff`

**Screen Recording Points:**

10. **Home Dashboard**
    - Real-time operational stats: pending approvals, orders in processing, out for delivery
    - Alert banner for pending orders
    - Quick access to all functions

11. **Orders Tab**
    - Swipe-friendly order management
    - Status filters: All/Pending/Processing/Completed
    - One-tap approve/reject

12. **B2B User Management**
    - Role-based category cards: WSD, Dealer, Retailer, MPCS, Hotel, Institution
    - User counts per category
    - Profile views with sales history

13. **Delivery Management** (More > Delivery)
    - Driver list with online/offline status
    - Segment-wise assignment (Fresh Milk/Products/Ice Cream drivers)
    - Add new drivers with vehicle details
    - Delivery summary dashboard

14. **Live Tracking** (Tracking Tab)
    - Real-time GPS locations with coordinates
    - Speed indicators (km/h)
    - Online/Offline status with green dot indicators
    - Active route assignments
    - Marketing staff attendance tracking

> "The PWA Staff App puts the entire union operation in the palm of your hand - from order approvals and driver management to real-time GPS tracking."

---

### SECTION 5: DELIVERY & LOGISTICS (3:30 - 4:15)

**[PLAY: 05-delivery-logistics.mp4]**

**Exclusive Features:**

15. **Segment-Wise Auto-Assignment**
    > "When an order moves to 'Assigned to Delivery,' our system automatically assigns the nearest online driver who matches the product segment - ensuring Fresh Milk goes with refrigerated vehicles, not regular vans."

16. **Route Optimization**
    - Nearest-neighbor algorithm with 2-opt improvement
    - Per-stop distance calculation
    - Estimated delivery times
    - Depot-based route planning

17. **Driver Tracking**
    - 6 demo drivers across 3 segments
    - Real-time GPS coordinates near Coimbatore
    - Speed, heading, active route display
    - Assigned order counts

---

### SECTION 6: COMPLIANCE & DMS (4:15 - 4:45)

**[PLAY: 06-tech-dashboard.mp4]**

**Screen Recording Points:**

18. **E-way Bill System** (`/admin/eway-bill`)
    - Automated generation for inter-state/high-value orders
    - GST portal integration
    - Bill tracking and cancellation

19. **GSTR Returns** (`/admin/dms-gstr`)
    - GSTR-1 with B2B/B2C breakdowns
    - GSTR-3B tax liability summary
    - Monthly JSON file generation

20. **DMS Suite Highlights**
    - Batch-wise inventory with mfg/expiry tracking
    - GRN (Goods Receipt Notes) with approval workflow
    - Collection management with aging analysis
    - Promotional schemes with budget tracking
    - Sales Force Automation (SFA) with beat planning
    - Tally integration (bidirectional XML import/export)

> "From E-way Bills to GST returns, from inventory management to Tally integration - Aavin Cart handles every compliance requirement out of the box."

---

### CLOSING (4:45 - 5:00)

**[PLAY: 03-ecommerce-ordering.mp4]**

> "Aavin Cart - Modernizing India's largest cooperative dairy network. From 3.85 lakh farmers to millions of consumers, powered by technology."

**Key Stats to Display:**
- 31 District Unions
- 3 Product Segments
- 6-Tier Pricing
- 8-Stage Order Workflow
- Full GST & E-way Bill Compliance
- Real-Time GPS Tracking
- PWA Mobile Apps for Staff & Drivers

---

## LOGIN CREDENTIALS REFERENCE

| Portal | URL | Username/Email | Password |
|--------|-----|---------------|----------|
| Admin Panel | `/admin/login` | admin@aavin.in | admin123 |
| Merchant/Union Portal | `/district-union/login` | cbe | Union@123 |
| PWA Staff App | `/pwa/staff` | teststore | admin123 |
| Kitchen Display | `/kds` | teststore | admin123 |
| B2B Customer | `/` (customer login) | wsd.murugan@demo.in | Demo@123 |
| Consumer | `/` (customer login) | consumer.ramesh@demo.in | Demo@123 |

---

## EXCLUSIVE FEATURES CHECKLIST

- [ ] 6-Tier Role-Based Pricing (Federation to MRP)
- [ ] 3-Segment B2B Order Splitting (Fresh Milk / Products / Ice Cream)
- [ ] 8-Stage Order Workflow with Visual Tracking
- [ ] Segment-Wise Driver Auto-Assignment
- [ ] GST-Compliant Invoicing with Union-Specific Numbering (SLM/2526/SEQ)
- [ ] E-way Bill Generation & Tracking
- [ ] GSTR-1 & GSTR-3B Returns Generation
- [ ] GPS Driver Tracking with Speed & Route Info
- [ ] Nearest-Neighbor Route Optimization with 2-opt
- [ ] Kitchen Display System (KDS) for Production
- [ ] PWA Staff App with Full B2B Management
- [ ] Sales Force Automation (SFA) with Beat Planning
- [ ] Batch-wise Inventory with Expiry Tracking
- [ ] Tally Integration (Bidirectional XML)
- [ ] Collection Management with Aging Analysis
- [ ] Daily Indent Credit System for B2B
- [ ] Push Notifications (FCM)
- [ ] User Activity Tracking & App Performance Dashboard
- [ ] POS Module with Barcode/Voice Search

---

## TIPS FOR RECORDING

1. **Use a screen recorder** (OBS Studio, Loom, or similar) at 1920x1080
2. **Play video clips** as transitions between sections
3. **Narrate live** or add voiceover in post-production using the script above
4. **Highlight cursor clicks** for visibility
5. **Keep each section tight** - the script is designed for ~45 seconds per section
6. **Seed demo data first** by calling: `POST /api/dev/seed-demo-data`
7. **Ensure drivers are seeded** for tracking demo: visible in Tracking tab and Delivery Management

---

*Generated for Aavin Cart Professional Demo - TCMPF Distribution Management System*
