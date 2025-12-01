# 📐 Entity Relationship Diagram (ERD)

## Visual Database Architecture

### Full Schema Diagram (Mermaid)

```mermaid
erDiagram
    restaurants ||--o{ restaurant_onboarding : has
    restaurants ||--|| restaurant_settings : has
    restaurants ||--o{ staff_accounts : employs
    restaurants ||--o{ customers : serves
    restaurants ||--o{ menu_categories : organizes
    restaurants ||--o{ menu_items : offers
    restaurants ||--o{ orders : receives
    restaurants ||--o{ tables : contains
    restaurants ||--o{ audit_logs : tracks
    
    staff_accounts ||--o{ orders : creates
    staff_accounts ||--o{ audit_logs : performs
    staff_accounts ||--o{ inventory_transactions : records
    
    customers ||--o{ orders : places
    
    menu_categories ||--o{ menu_items : categorizes
    
    menu_items ||--o{ order_items : "appears in"
    menu_items ||--o{ inventory_transactions : affects
    
    orders ||--o{ order_items : contains
    orders ||--o{ audit_logs : generates
    
    tables ||--o| orders : "current order"
    
    restaurants {
        uuid id PK
        text code UK
        text name
        text owner_email UK
        text owner_password_hash
        text experience_type
        text subscription_tier
        boolean is_active
        timestamptz created_at
    }
    
    restaurant_onboarding {
        uuid id PK
        uuid restaurant_id FK
        text concept_vision
        text[] service_modes
        text[] cuisine_focus
        text price_position
    }
    
    restaurant_settings {
        uuid id PK
        uuid restaurant_id FK
        jsonb business_hours
        numeric tax_rate
        boolean tax_inclusive
        numeric service_charge_rate
        boolean enable_loyalty_points
    }
    
    staff_accounts {
        uuid id PK
        uuid restaurant_id FK
        text name
        text role
        text passcode_hash
        boolean is_owner
        boolean is_active
    }
    
    customers {
        uuid id PK
        uuid restaurant_id FK
        text full_name
        text phone UK
        text email
        numeric total_spend
        integer visit_count
        integer loyalty_points
        boolean is_vip
        timestamptz last_order_at
    }
    
    menu_categories {
        uuid id PK
        uuid restaurant_id FK
        text name
        integer display_order
        boolean is_active
    }
    
    menu_items {
        uuid id PK
        uuid restaurant_id FK
        uuid category_id FK
        text name
        text category
        numeric price
        numeric cost
        integer prep_time_minutes
        boolean is_available
        boolean is_popular
        integer stock_quantity
    }
    
    tables {
        uuid id PK
        uuid restaurant_id FK
        text table_number UK
        integer capacity
        text status
        uuid current_order_id FK
        text section
    }
    
    orders {
        uuid id PK
        uuid restaurant_id FK
        uuid customer_id FK
        uuid staff_id FK
        text status
        text fulfillment_type
        text table_number
        numeric subtotal
        numeric tax
        numeric discount
        numeric tip
        numeric total
        text payment_method
        text payment_status
        timestamptz created_at
        timestamptz ready_at
        timestamptz completed_at
    }
    
    order_items {
        uuid id PK
        uuid order_id FK
        uuid menu_item_id FK
        text name
        numeric price
        integer quantity
        numeric line_total
        text status
        jsonb modifiers
    }
    
    inventory_transactions {
        uuid id PK
        uuid restaurant_id FK
        uuid menu_item_id FK
        uuid staff_id FK
        text transaction_type
        integer quantity
        integer previous_quantity
        integer new_quantity
        timestamptz created_at
    }
    
    audit_logs {
        uuid id PK
        uuid restaurant_id FK
        uuid staff_id FK
        text entity_type
        uuid entity_id
        text action
        jsonb old_values
        jsonb new_values
        timestamptz created_at
    }
```

---

## Simplified Core Flow Diagram

```mermaid
graph TB
    R[Restaurant] --> S[Staff Accounts]
    R --> C[Customers]
    R --> M[Menu Items]
    
    S --> O[Orders]
    C --> O
    
    O --> OI[Order Items]
    M --> OI
    
    O --> |status changes| KDS[Kitchen Display]
    O --> |completed| METRICS[Dashboard Metrics]
    
    style R fill:#e1f5ff
    style O fill:#fff4e1
    style METRICS fill:#e8f5e9
    style KDS fill:#fff3e0
```

---

## Order Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> new: Order Created
    new --> preparing: Chef Starts
    preparing --> ready: Food Ready
    ready --> completed: Customer Receives
    new --> cancelled: Order Cancelled
    preparing --> cancelled: Order Cancelled
    completed --> [*]
    cancelled --> [*]
    
    note right of new
        Waiter creates order
        Items sent to kitchen
    end note
    
    note right of preparing
        Chef marks as preparing
        Kitchen display updates
    end note
    
    note right of ready
        Food ready for pickup
        Notify waiter/customer
    end note
    
    note right of completed
        Order delivered
        Payment confirmed
        Customer stats updated
    end note
```

---

## Data Flow: Creating an Order

```mermaid
sequenceDiagram
    participant W as Waiter (Staff)
    participant DB as Database
    participant T as Triggers
    participant V as Views
    
    W->>DB: Insert Order
    DB->>T: Fire create_audit_log()
    T->>DB: Insert audit_logs entry
    
    W->>DB: Insert Order Items
    DB->>T: Fire calculate_order_totals()
    T->>DB: Update order.total
    
    DB->>T: Fire update_menu_stock()
    T->>DB: Decrement menu_items.stock_quantity
    T->>DB: Insert inventory_transactions
    
    Note over W,V: Order is now visible in kitchen
    
    W->>DB: Query kitchen orders
    DB->>V: Select from active orders view
    V-->>W: Return filtered results
```

---

## Multi-Tenancy Architecture

```mermaid
graph TD
    APP[Application] --> RLS[Row Level Security]
    RLS --> |restaurant_id = X| R1[Restaurant 1 Data]
    RLS --> |restaurant_id = Y| R2[Restaurant 2 Data]
    RLS --> |restaurant_id = Z| R3[Restaurant 3 Data]
    
    R1 --> C1[Customers]
    R1 --> O1[Orders]
    R1 --> M1[Menu]
    
    R2 --> C2[Customers]
    R2 --> O2[Orders]
    R2 --> M2[Menu]
    
    R3 --> C3[Customers]
    R3 --> O3[Orders]
    R3 --> M3[Menu]
    
    style RLS fill:#ffebee
    style R1 fill:#e8f5e9
    style R2 fill:#e3f2fd
    style R3 fill:#fff3e0
```

---

## Indexing Strategy

```mermaid
graph LR
    subgraph Primary Indexes
        PK[Primary Keys - uuid]
    end
    
    subgraph Foreign Key Indexes
        FK1[restaurant_id on all tables]
        FK2[customer_id on orders]
        FK3[order_id on order_items]
    end
    
    subgraph Filtered Indexes
        F1[is_active = true]
        F2[status IN 'new', 'preparing', 'ready']
        F3[created_at = today]
    end
    
    subgraph Composite Indexes
        C1[restaurant_id, created_at DESC]
        C2[restaurant_id, status, created_at]
        C3[restaurant_id, phone]
    end
    
    PK --> FAST[Fast Queries]
    FK1 --> FAST
    FK2 --> FAST
    FK3 --> FAST
    F1 --> FAST
    F2 --> FAST
    F3 --> FAST
    C1 --> FAST
    C2 --> FAST
    C3 --> FAST
```

---

## Relationship Cardinality Summary

| Relationship | Type | Cascade | Description |
|-------------|------|---------|-------------|
| Restaurant → Staff | 1:M | CASCADE | Delete restaurant → delete all staff |
| Restaurant → Customers | 1:M | CASCADE | Delete restaurant → delete all customers |
| Restaurant → Menu Items | 1:M | CASCADE | Delete restaurant → delete all menu |
| Restaurant → Orders | 1:M | CASCADE | Delete restaurant → delete all orders |
| Customer → Orders | 1:M | SET NULL | Delete customer → keep orders (orphan) |
| Staff → Orders | 1:M | SET NULL | Delete staff → keep orders (orphan) |
| Order → Order Items | 1:M | CASCADE | Delete order → delete all items |
| Menu Item → Order Items | 1:M | SET NULL | Delete menu item → keep order history |
| Category → Menu Items | 1:M | SET NULL | Delete category → keep items |
| Table → Order (current) | 1:1 | SET NULL | Delete order → free up table |

---

## Trigger Execution Flow

```mermaid
flowchart TD
    A[DML Operation] --> B{Which Table?}
    
    B --> |orders| C[Order Triggers]
    B --> |order_items| D[Order Item Triggers]
    B --> |menu_items| E[Menu Item Triggers]
    B --> |customers| F[Customer Triggers]
    B --> |*| G[General Triggers]
    
    C --> C1[set_order_timestamps]
    C --> C2[update_customer_stats]
    C --> C3[create_audit_log]
    
    D --> D1[calculate_order_totals]
    D --> D2[update_menu_stock]
    
    E --> E1[create_audit_log]
    
    F --> F1[update_updated_at]
    
    G --> G1[update_updated_at]
    
    C1 --> RESULT[Committed Transaction]
    C2 --> RESULT
    C3 --> RESULT
    D1 --> RESULT
    D2 --> RESULT
    E1 --> RESULT
    F1 --> RESULT
    G1 --> RESULT
```

---

## View Dependency Tree

```mermaid
graph TD
    BASE_ORDERS[orders table] --> KITCHEN[kitchen_efficiency view]
    BASE_ORDERS --> SALES[daily_sales_summary view]
    
    BASE_CUSTOMERS[customers table] --> CUST_ANALYTICS[customer_analytics view]
    BASE_ORDERS --> CUST_ANALYTICS
    
    BASE_MENU[menu_items table] --> MENU_PERF[menu_item_performance view]
    BASE_ORDER_ITEMS[order_items table] --> MENU_PERF
    
    BASE_STAFF[staff_accounts table] --> STAFF_PERF[staff_performance view]
    BASE_ORDERS --> STAFF_PERF
    
    style BASE_ORDERS fill:#e8f5e9
    style BASE_CUSTOMERS fill:#e8f5e9
    style BASE_MENU fill:#e8f5e9
    style BASE_ORDER_ITEMS fill:#e8f5e9
    style BASE_STAFF fill:#e8f5e9
    style KITCHEN fill:#fff3e0
    style SALES fill:#fff3e0
    style CUST_ANALYTICS fill:#fff3e0
    style MENU_PERF fill:#fff3e0
    style STAFF_PERF fill:#fff3e0
```

---

## Security Model (RLS Policies)

```mermaid
graph TD
    USER[Authenticated User] --> SESSION[Set Session Variable]
    SESSION --> |app.current_restaurant_id| RLS[RLS Policy Check]
    
    RLS --> CHECK{restaurant_id matches?}
    
    CHECK --> |YES| ALLOW[Return Rows]
    CHECK --> |NO| DENY[Return Empty Set]
    
    ALLOW --> ORDERS[User's Orders]
    ALLOW --> CUSTOMERS[User's Customers]
    ALLOW --> MENU[User's Menu]
    
    style USER fill:#e3f2fd
    style SESSION fill:#fff3e0
    style RLS fill:#ffebee
    style CHECK fill:#fff9c4
    style ALLOW fill:#e8f5e9
    style DENY fill:#ffcdd2
```

---

## Performance Optimization Layers

```mermaid
graph TD
    QUERY[Query Request] --> CACHE[Query Cache]
    CACHE --> |MISS| INDEX[Index Lookup]
    CACHE --> |HIT| RETURN[Return Results]
    
    INDEX --> PARTIAL[Partial Index?]
    PARTIAL --> |YES| FAST[Fast Filtered Scan]
    PARTIAL --> |NO| COMPOSITE[Composite Index?]
    
    COMPOSITE --> |YES| FAST
    COMPOSITE --> |NO| FK[Foreign Key Index?]
    
    FK --> |YES| FAST
    FK --> |NO| SEQSCAN[Sequential Scan]
    
    FAST --> RETURN
    SEQSCAN --> SLOW[Slow Query ⚠️]
    SLOW --> RETURN
    
    style CACHE fill:#e8f5e9
    style INDEX fill:#e3f2fd
    style FAST fill:#c8e6c9
    style SLOW fill:#ffcdd2
```

---

## Notes on Diagram Usage

### Rendering Mermaid Diagrams

These diagrams use [Mermaid](https://mermaid.js.org/) syntax. To view them:

1. **GitHub/GitLab:** Renders automatically in Markdown
2. **VS Code:** Install "Markdown Preview Mermaid Support" extension
3. **Online:** Paste into https://mermaid.live/
4. **Export:** Use mermaid-cli for PNG/SVG generation

### Legend

- **PK** = Primary Key
- **FK** = Foreign Key
- **UK** = Unique Key
- **M:M** = Many-to-Many
- **1:M** = One-to-Many
- **1:1** = One-to-One
- **→** = References / Points to

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Tool:** Mermaid v10+  
**Status:** Complete 📐

