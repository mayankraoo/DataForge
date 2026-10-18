import openpyxl
import random

random.seed(42)

wb = openpyxl.Workbook()

# Sheet 1: Employees
ws1 = wb.active
ws1.title = "Employee_Info"
ws1.append(["EmployeeID", "FullName", "Age", "Department", "JoinDate", "Email"])

departments = ["Engineering", "engineering ", "ENGINEERING", "Human Resources", "HR", "Sales", "sales", "Marketing", "Finance", ""]
null_variants = ["", "N/A", "null", "none", "-"]

for i in range(1, 650):
    emp_id = f"EMP-{1000 + i}"
    fname = random.choice(["Amit", "Sneha", "Kunal", "Ritu", "Deepak", "Swati", "Naveen", "Sunita "])
    lname = random.choice(["Kumar", "Singh", "Joshi", "Nair", "Das", "Rao"])
    name = f"{fname} {lname}"
    
    # Age: mostly 22-60, some negatives, some extreme (>120), some nulls
    r = random.random()
    if r < 0.03:
        age = -25 # negative age
    elif r < 0.05:
        age = 150 # impossible age
    elif r < 0.08:
        age = random.choice(null_variants)
    else:
        age = random.randint(22, 60)
        
    dept = random.choice(departments)
    join_date = f"202{random.randint(0,4)}-0{random.randint(1,9)}-15"
    email = f"{fname.strip().lower()}.{lname.lower()}@acmecorp.com"
    if random.random() < 0.05:
        email = "not_an_email"
        
    ws1.append([emp_id, name, age, dept, join_date, email])

# Sheet 2: Salaries
ws2 = wb.create_sheet(title="Salary_Data")
ws2.append(["EmployeeID", "BaseSalary", "Bonus", "Currency", "PayFrequency"])

for i in range(1, 650):
    emp_id = f"EMP-{1000 + i}"
    
    # Salary: mix of 50k, 50,000, $50000, 5k
    r = random.random()
    base = random.randint(30, 180)
    if r < 0.15:
        salary = f"{base}k" # "50k" style amounts
    elif r < 0.35:
        salary = f"${base*1000:,}"
    elif r < 0.4:
        salary = random.choice(null_variants)
    else:
        salary = base * 1000
        
    bonus = random.choice(["5%", "10%", "15%", "0", "N/A", 2500, 5000])
    currency = "USD" if random.random() < 0.8 else "EUR"
    pay_freq = "Monthly" # Constant column example
    
    ws2.append([emp_id, salary, bonus, currency, pay_freq])

wb.save("c:/Users/amol2/OneDrive/Desktop/Data organiser/sample_data/employees_messy.xlsx")
print("Generated employees_messy.xlsx with 2 sheets")
