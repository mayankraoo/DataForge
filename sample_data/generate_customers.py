import csv
import random

random.seed(42)

rows = []
for i in range(1, 1000):
    cust_id = f"CUST-{10000 + i}"
    
    # Slight name differences / duplicate customer identities
    if i % 15 == 0:
        first = "John"
        last = "Doe"
        phone = "+1 (555) 019-2834"
    elif i % 15 == 1:
        first = "Jon"
        last = "Doe" # typo variant
        phone = "555-019-2834"
    else:
        first = random.choice(["Alice", "Bob", "Charlie", "David", "Emma", "Frank", "Grace", "Henry"])
        last = random.choice(["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller"])
        phone = f"+1-{random.randint(200,999)}-{random.randint(100,999)}-{random.randint(1000,9999)}" if random.random() < 0.9 else "invalid-phone"
        
    email = f"{first.lower()}.{last.lower()}@domain.com"
    if random.random() < 0.08:
        email = "broken_email@"
    elif random.random() < 0.05:
        email = "unknown"
        
    status = "Active" # Constant column for detector demo!
    legacy_notes = "" if random.random() < 0.98 else "Rare legacy note" # Near-empty column
    signup_country = "US" if random.random() < 0.96 else "CA" # Near-constant column
    lifetime_value = round(random.uniform(50.0, 3500.0), 2)
    
    rows.append([cust_id, f"{first} {last}", email, phone, status, legacy_notes, signup_country, lifetime_value])

with open("c:/Users/amol2/OneDrive/Desktop/Data organiser/sample_data/customers_messy.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["CustomerID", "CustomerName", "Email", "PhoneNumber", "Status", "LegacyNotes", "SignupCountry", "LifetimeValue"])
    writer.writerows(rows)

print("Generated customers_messy.csv with 999 rows")
