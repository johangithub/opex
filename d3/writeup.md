I noticed that demand for each product and customer was equal each year, so removed duplicate data

Each plant can run 240 * 12 = 2880 hours with no overtime
Plant 1: 100 tons/hr -> 288000 tons
Plant 2: 50 tons/hr -> 144000 tons, but only need to run to meet 18000 per quarter (45 days)
Plant 3: 50 tons/hr -> 144000 tons, but only need to run to meet 7500 per quarter (18.75 days)
Plant 4: 50 tons/hr but switching each quarter (8 days for Product 4 to 5 and 6 days for product 5 to 4),
Quarter 1: product 4 at 60 hours * 50 tons = 3000 tons, switch for 8 days, product 5 at 30 hours * 50 tons = 1500 tons, switch for 6 days (26 days)
Quarter 2: product 4 at 60 hours * 50 tons = 3000 tons, switch for 8 days, product 5 at 30 hours * 50 tons = 1500 tons, switch for 6 days (26 days)
Quarter 3: product 4 at 60 hours * 50 tons = 3000 tons, switch for 8 days, product 5 at 30 hours * 50 tons = 1500 tons, switch for 6 days (26 days)
Quarter 4: product 4 at 60 hours * 50 tons = 3000 tons, switch for 8 days, product 5 at 30 hours * 50 tons = 1500 tons, switch for 6 days (26 days)

Production cost per ton
Product 1: 500
Product 2: 400
Product 3: 300
Product 4: 200
Product 5: 100

Quarterly production cost:
500 * 72000 = 36000000
400 * 18000 = 7200000
300 * 7500 = 2250000
200 * 3000 = 600000
100 * 1500 = 150000

Revenue per ton is 1000 for customer 1-39
1200 for customer 40-50

Baseline covered customers for each product:
Product 1: 10, 19, 20, 27, 31
Product 2: 5,6,16,17,18,30,34,41,48,49
Product 3: 14,30,32,35
Product 4: 2,28,36
Product 5: 2,28,36


Possible upgrade scenarios:
Upgrade 1 plant (1,2,3,4)
Upgrade 2 plants (12, 13, 14, 23, 24, 34)
Upgrade 3 plants (123, 124, 134, 234)
Upgrade all plants (1234)

For each upgrade scenario consider different demand-fulfilling strategy
--Fulfill to the closest demand no matter the capacity. With simulation of upgrade all plants, plant 3 ends up being overworked.
This also doesn't take advantage of plant 1 being more efficient.

--Let plant 4 take care of nation-wide fulfillment of product 4 and 5, and let everyone else take care of every other demand
--This may work because of low demand of product 4 and 5. 

Upgrading plant 4 nor fulfilling product 4 or 5 from other locations doesn't make sense, as the total transport cost for product 4 and 5 is $1.2M
and 4 is not in a favorable location.

There are many different ways to cycle through products to meet demands. It takes 31 days to cycle through all products

Plant, customer, and product details are given on the first three tabs of the workbook (“Plants”, “Customers”, and “Product”).
Annual Demand is given in the “Demand” worksheet.  Demand should be satisfied on a quarterly basis (assume that all quarters have the same expected demand).
Product revenues are also given per ton in the “Demand” worksheet. 
Products are shipped in trucks which can carry 10 tons each.  Shipping costs 2$ per truck per mile.
Currently, products 4 and 5 (blue and grey) are made at plant 4.  Products 1, 2, and 3 (clear, green, and red) are made at plants 1, 2, and 3, respectively.
The manufacturing process for every product is different and the plant/product level capacities and costs are given in the “Production Capacity” worksheet.
In addition to plant/product level constraints, each plant has working hour constraints:
Each plant can only run for 240 hours/month (8 hours per day, 30 days per month) when running without overtime. 
An additional 120 hours/month of overtime are available, but at an increased overtime production cost (50% more than regular time). Overtime hours can be used incrementally.
Plant 1 is the fastest and can make products at the rate of 100 tons/hour. 
All other plants can produce products at 50 tons/hour.
Production costs are given per ton in the “Production Capacity” worksheet.
Note that at plant 4 there is one setup required, as the plant must produce products 4 and 5. This will result in the plant switching setups once each quarter. It costs 8 days to switch from product 4 to 5, and 6 to switch back.

In order to save on transportation costs and improve service, it has been proposed that investments in the production capabilities at each plant be made.  These investments would allow each of the plants to produce all products, albeit with a setup time and cost for switching from one product to another.  The CEO would like to know how much such an investment could possibly save in annual costs, after the initial investment has been made.  

Setup costs are different between different products. 
For example, going from product 1 (clear) to product 2 (green) costs four days, while clear to grey (product 5) costs only 2 days.  
These costs are given in days in the worksheet “Setups”.  Each setup costs $5,000 per day.
Setups also affect capacities (overall plant hour based capacities only).  If five days are given to setups, that’s five days (40 hours) of production capacity lost.
This does not affect product/location specific constraints.
The cost of upgrading each plant is $10,000,000 per plant.

Assumptions: 
Only one kind of product can be shipped in each shipment.
You cannot produce two different products in one day.
Assumed 30 days * 12 months  = 360 days
Delivery is fulfilled immediately and done at the end of the quarter.