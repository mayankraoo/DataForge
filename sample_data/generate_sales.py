import csv
import random
import datetime

# Seed for reproducibility
random.seed(42)

cities = ["Delhi", "delhi ", "DELHI", "New Delhi", "Mumbai", "mumbai", "MUMBAI", "Bangalore", "bengaluru", "Bengaluru ", "Kolkata", "Chennai"]
products = ["Laptop Pro", "Wireless Mouse", "USB-C Hub", "Mechanical Keyboard", "Monitor 4K", "Noise-Cancelling Headphones", "Webcam HD"]
null_variants = ["", "NA", "N/A", "null", "none", "-", "?", "unknown"]

rows = []
base_date = datetime.date(2024, 1, 1)

for i in range(1, 2050):
    order_id = f"ORD-{1000 + (i if i <= 2000 else random.randint(1, 1900))}" # Introduce ~50 duplicate order IDs
    
    # Dates: mix DD/MM/YYYY, MM-DD-YYYY, and YYYY/MM/DD, plus a few impossible/future dates
    dt = base_date + datetime.timedelta(days=random.randint(0, 365))
    if random.random() < 0.05:
        order_date = dt.strftime("%d/%m/%Y")
    elif random.random() < 0.1:
        order_date = dt.strftime("%m-%d-%Y")
    elif random.random() < 0.02:
        order_date = "31/02/2024" # impossible date
    else:
        order_date = dt.strftime("%Y-%m-%d")
        
    # City with casing/whitespace variants & nulls
    if random.random() < 0.04:
        city = random.choice(null_variants)
    else:
        city = random.choice(cities)
        
    product = random.choice(products)
    
    # Quantity: mostly 1-10, some negative quantities, some nulls
    if random.random() < 0.03:
        quantity = random.choice(null_variants)
    elif random.random() < 0.02:
        quantity = -1 * random.randint(1, 5) # negative quantity issue
    else:
        quantity = random.randint(1, 15)
        
    # Unit Price: string with currency symbol, some commas, some outliers
    base_price = random.randint(25, 1200)
    if random.random() < 0.01:
        base_price = 85000 # extreme outlier
    
    if random.random() < 0.03:
        unit_price = random.choice(null_variants)
    elif random.random() < 0.3:
        unit_price = f"${base_price:,.2f}"
    elif random.random() < 0.3:
        unit_price = f"₹{base_price * 80}"
    else:
        unit_price = f"{base_price}.00"
        
    # Customer name with whitespace
    first_names = [" Aarav", "Diya", " Rohan ", "Ananya", "Vikram", "Pooja", "Arjun", "Priya "]
    last_names = ["Sharma", "Verma", "Patel", "Reddy", "Mehta", "Iyer"]
    cust_name = f"{random.choice(first_names)} {random.choice(last_names)}"
    
    # Customer Rating: 1 to 5, occasionally 0 or >5 or mixed string
    if random.random() < 0.03:
        rating = "Excellent" # mixed data type in numeric column
    elif random.random() < 0.02:
        rating = 0 # implausible rating
    else:
        rating = random.randint(1, 5)
        
    # Discount
    discount = f"{random.choice([0, 5, 10, 15, 20])}%" if random.random() < 0.5 else str(random.choice([0, 0.05, 0.1, 0.15]))

    rows.append([order_id, order_date, cust_name, city, product, quantity, unit_price, discount, rating])

with open("c:/Users/amol2/OneDrive/Desktop/Data organiser/sample_data/sales_messy.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["OrderID", "OrderDate", "CustomerName", "City", "Product", "Quantity", "UnitPrice", "Discount", "CustomerRating"])
    writer.writerows(rows)

print("Generated sales_messy.csv with 2049 rows")
