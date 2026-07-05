// Generator script for test import data
// Run: node resources/generate-test-data.js

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

function uid() {
  return crypto.randomBytes(8).toString('hex')
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randPrice() {
  return +(Math.random() * 200 + 1).toFixed(2)
}

const listNames = [
  'Weekly Groceries', 'Birthday Party', 'BBQ Supplies', 'Office Lunch',
  'Pizza Night', 'Sushi Dinner', 'Camping Trip', 'Home Depot Run',
  'Costco Bulk', 'Farmers Market', 'Thanksgiving Dinner', 'Christmas Shopping',
  'Beach Picnic', 'Game Night Snacks', 'Baby Shower', 'Wedding Reception',
  'Brunch Club', 'Taco Tuesday', 'Date Night', 'Team Outing',
  'Potluck Items', 'Road Trip Snacks', 'Pharmacy Run', 'Pet Supplies',
  'Back to School', 'New Year Party', 'Super Bowl Party', 'Easter Dinner',
  'Valentines Day', 'Halloween Candy', 'Book Club Wine', 'Yoga Retreat',
  'Housewarming', 'Graduation Party', 'Summer Cookout', 'Kids Lunch Prep',
  'Smoothie Ingredients', 'Baking Supplies', 'Coffee Run', 'Food Truck Fest',
  'Wine Tasting', 'Cheese Board', 'Meal Prep Sunday', 'Spa Day Treats',
  'Movie Marathon', 'Breakfast Club', 'Dinner Party', 'Karaoke Night',
  'Fundraiser Gala', 'Family Reunion', 'Anniversary Dinner', 'Lunch Meeting',
  'Happy Hour', 'Garden Party', 'Pool Party', 'Ski Trip Food',
  'Concert Tailgate', 'Boat Day', 'Festival Supplies', 'Charity Event',
]

const itemNames = [
  'Rice', 'Beans', 'Chicken Breast', 'Ground Beef', 'Salmon', 'Shrimp',
  'Bread', 'Eggs', 'Milk', 'Cheese', 'Butter', 'Yogurt',
  'Tomatoes', 'Onions', 'Garlic', 'Potatoes', 'Lettuce', 'Carrots',
  'Apples', 'Bananas', 'Oranges', 'Strawberries', 'Avocado', 'Lemons',
  'Pasta', 'Olive Oil', 'Soy Sauce', 'Hot Sauce', 'Ketchup', 'Mustard',
  'Beer', 'Wine', 'Soda', 'Juice', 'Water', 'Coffee',
  'Chips', 'Cookies', 'Ice Cream', 'Chocolate', 'Crackers', 'Nuts',
  'Paper Towels', 'Trash Bags', 'Soap', 'Shampoo', 'Toothpaste', 'Napkins',
  'Pizza', 'Burger', 'Fries', 'Salad', 'Soup', 'Steak',
  'Sushi Roll', 'Ramen', 'Tacos', 'Burrito', 'Pad Thai', 'Curry',
  'Appetizer', 'Dessert', 'Cocktail', 'Espresso', 'Latte', 'Smoothie',
]

const pubItemNames = [
  'Draft Beer', 'IPA Pint', 'Lager', 'Stout', 'Pale Ale', 'Pilsner',
  'Wings', 'Nachos', 'Onion Rings', 'Fish & Chips', 'Burger Slider',
  'Fries Basket', 'Pretzels', 'Loaded Potato Skins', 'Mozzarella Sticks',
  'Whiskey', 'Gin & Tonic', 'Mojito', 'Margarita', 'Old Fashioned',
  'Caipirinha', 'Shot', 'Jagerbomb', 'Long Island', 'Sangria',
  'Darts Game', 'Pool Table', 'Karaoke Room', 'Cover Charge',
]

const sectionNames = [
  'Fruits & Vegetables', 'Meat & Seafood', 'Dairy', 'Bakery',
  'Beverages', 'Snacks', 'Cleaning', 'Personal Care',
  'Frozen', 'Canned Goods', 'Appetizers', 'Main Course',
  'Desserts', 'Drinks', 'Sides', 'Specials',
]

const personNames = [
  'Alice', 'Bob', 'Carlos', 'Diana', 'Eduardo',
  'Fernanda', 'Gabriel', 'Helena', 'Igor', 'Julia',
  'Kevin', 'Laura', 'Miguel', 'Nina', 'Oscar',
  'Patricia', 'Rafael', 'Sofia', 'Thiago', 'Valentina',
]

function generatePeople() {
  const count = randInt(0, 5)
  if (count === 0) return []
  const shuffled = [...personNames].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map(name => ({ id: uid(), name }))
}

function generateItems(people, numItems, type) {
  const items = []
  const namePool = type === 'bar' ? pubItemNames : itemNames
  const shuffledNames = [...namePool].sort(() => Math.random() - 0.5)

  for (let i = 0; i < numItems; i++) {
    const item = {
      id: uid(),
      name: shuffledNames[i % shuffledNames.length],
      quantity: randInt(1, 10),
      unitPrice: randPrice(),
      selected: Math.random() > 0.4,
      includeInTax: Math.random() > 0.3,
    }

    // Randomly assign to people (30% chance)
    if (people.length > 0 && Math.random() > 0.7) {
      const numAssigned = randInt(1, Math.min(3, people.length))
      const shuffledPeople = [...people].sort(() => Math.random() - 0.5)
      item.assignedTo = shuffledPeople.slice(0, numAssigned).map(p => p.id)
    }

    items.push(item)
  }
  return items
}

function generateSections(items) {
  const hasSections = Math.random() > 0.3 // 70% have sections
  if (!hasSections || items.length < 4) return []

  const numSections = randInt(1, Math.min(4, Math.floor(items.length / 2)))
  const shuffledSectionNames = [...sectionNames].sort(() => Math.random() - 0.5)
  const sections = []

  // Assign some items to sections (not all, leave some unassigned)
  const assignableItems = [...items].sort(() => Math.random() - 0.5)
  const itemsToAssign = assignableItems.slice(0, Math.floor(items.length * 0.7))
  let itemIndex = 0

  for (let i = 0; i < numSections; i++) {
    const itemsInSection = randInt(2, Math.min(6, itemsToAssign.length - itemIndex))
    const sectionItemIds = []

    for (let j = 0; j < itemsInSection && itemIndex < itemsToAssign.length; j++) {
      sectionItemIds.push(itemsToAssign[itemIndex].id)
      itemIndex++
    }

    if (sectionItemIds.length > 0) {
      sections.push({
        id: uid(),
        name: shuffledSectionNames[i % shuffledSectionNames.length],
        itemIds: sectionItemIds,
        collapsed: Math.random() > 0.7,
      })
    }
  }

  return sections
}

function generateList(name, archived, isTemplate) {
  const type = pick(['shopping', 'restaurant', 'bar'])
  const currency = pick(['BRL', 'USD'])
  const people = generatePeople()
  const numItems = randInt(3, 15)
  const items = generateItems(people, numItems, type)
  const sections = generateSections(items)

  const list = {
    id: uid(),
    name,
    type,
    currency,
    taxPercentage: pick([0, 5, 8, 10, 12, 13, 15, 18, 20]),
    items,
    sections,
    archived,
  }

  if (isTemplate) {
    list.isTemplate = true
  }

  if (people.length > 0) {
    list.people = people
  }

  return list
}

// Generate all lists
const lists = []

// 35 active lists
for (let i = 0; i < 35; i++) {
  const name = listNames[i % listNames.length] + (i >= listNames.length ? ` #${i + 1}` : '')
  lists.push(generateList(name, false, false))
}

// 20 archived lists
for (let i = 0; i < 20; i++) {
  const name = listNames[(i + 35) % listNames.length] + ' (old)'
  lists.push(generateList(name, true, false))
}

// 100 templates
const templatePrefixes = ['Quick', 'Standard', 'Premium', 'Basic', 'Custom']
for (let i = 0; i < 100; i++) {
  const prefix = templatePrefixes[i % templatePrefixes.length]
  const baseName = listNames[i % listNames.length]
  lists.push(generateList(`${prefix} ${baseName}`, false, true))
}

const data = { lists }

const outputPath = path.join(__dirname, 'test-import-data.json')
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2))

console.log(`Generated ${lists.length} lists:`)
console.log(`  - 35 active`)
console.log(`  - 20 archived`)
console.log(`  - 100 templates`)
console.log(`Saved to: ${outputPath}`)
