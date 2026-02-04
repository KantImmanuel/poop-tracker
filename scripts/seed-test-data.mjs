#!/usr/bin/env node
/**
 * seed-test-data.mjs
 *
 * Seeds 6 test user accounts into the production database, each representing
 * a distinct IBS scenario for testing the correlation/insights engine.
 *
 * Usage:
 *   railway run node scripts/seed-test-data.mjs
 *
 * All accounts use password: testpass123
 * The script is idempotent — it deletes existing test users before re-creating.
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, '..', 'server');
const require = createRequire(path.join(serverDir, 'index.js'));

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

const PASSWORD = 'testpass123';
const SALT_ROUNDS = 10;

function daysAgo(days, hour = 12, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function ing(arr) {
  return JSON.stringify(arr);
}

function symptoms(arr) {
  return JSON.stringify(arr);
}

// ── Test user emails (for cleanup) ───────────────────────────────────────────

const TEST_EMAILS = [
  'dairy@test.com',
  'confounded@test.com',
  'healthy@test.com',
  'severe@test.com',
  'minimal@test.com',
  'timing@test.com',
];

// ── Seed a single user with meals and poops ──────────────────────────────────

async function seedUser(passwordHash, { email, meals, poops }) {
  // Delete existing user and cascade
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Delete in order: InsightReport, Food (via Meal cascade), Meal, PoopLog, User
    await prisma.insightReport.deleteMany({ where: { userId: existing.id } });
    await prisma.poopLog.deleteMany({ where: { userId: existing.id } });
    // Foods cascade from meals
    await prisma.meal.deleteMany({ where: { userId: existing.id } });
    await prisma.user.delete({ where: { id: existing.id } });
    console.log(`  Deleted existing user: ${email}`);
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
    },
  });

  // Create meals with foods
  for (const meal of meals) {
    await prisma.meal.create({
      data: {
        userId: user.id,
        timestamp: meal.timestamp,
        foods: {
          create: meal.foods.map(f => ({
            name: f.name,
            category: f.category || null,
            ingredients: f.ingredients, // already JSON string
            restaurant: f.restaurant || null,
            confidence: f.confidence || 0.9,
          })),
        },
      },
    });
  }

  // Create poop logs
  for (const poop of poops) {
    await prisma.poopLog.create({
      data: {
        userId: user.id,
        timestamp: poop.timestamp,
        severity: poop.severity,
        symptoms: poop.symptoms, // already JSON string
      },
    });
  }

  console.log(`  Created ${email}: ${meals.length} meals, ${poops.length} poops`);
}

// ── User 1: Clear Dairy Trigger ──────────────────────────────────────────────

function dairyUser() {
  return {
    email: 'dairy@test.com',
    meals: [
      {
        timestamp: daysAgo(18, 12, 30),
        foods: [{ name: 'Grilled Chicken Salad', category: 'Salad', ingredients: ing(['chicken breast', 'romaine lettuce', 'olive oil', 'lemon', 'salt']) }],
      },
      {
        timestamp: daysAgo(17, 8, 0),
        foods: [{ name: 'Oatmeal with Berries', category: 'Breakfast', ingredients: ing(['oats', 'blueberries', 'honey', 'water']) }],
      },
      {
        // DAIRY — triggers poop at daysAgo(15, 22)
        timestamp: daysAgo(16, 12, 0),
        foods: [{ name: 'Mac and Cheese', category: 'Pasta', ingredients: ing(['pasta', 'cheddar cheese', 'milk', 'butter', 'flour']) }],
      },
      {
        timestamp: daysAgo(15, 7, 30),
        foods: [{ name: 'Toast with Avocado', category: 'Breakfast', ingredients: ing(['sourdough bread', 'avocado', 'salt', 'red pepper flakes']) }],
      },
      {
        timestamp: daysAgo(14, 12, 0),
        foods: [{ name: 'Rice Bowl with Veggies', category: 'Bowl', ingredients: ing(['white rice', 'broccoli', 'carrots', 'soy sauce', 'sesame oil']) }],
      },
      {
        // DAIRY — triggers poop at daysAgo(13, 6) = 12h later
        timestamp: daysAgo(14, 18, 0),
        foods: [{ name: 'Fettuccine Alfredo', category: 'Pasta', ingredients: ing(['fettuccine pasta', 'cream', 'parmesan cheese', 'butter', 'garlic']) }],
      },
      {
        timestamp: daysAgo(12, 12, 0),
        foods: [{ name: 'Grilled Salmon', category: 'Entree', ingredients: ing(['salmon', 'olive oil', 'lemon', 'dill', 'white rice']) }],
      },
      {
        // DAIRY — triggers poop at daysAgo(10, 20)
        timestamp: daysAgo(11, 8, 0),
        foods: [{ name: 'Yogurt Parfait', category: 'Breakfast', ingredients: ing(['greek yogurt', 'granola', 'strawberries', 'honey']) }],
      },
      {
        timestamp: daysAgo(10, 12, 30),
        foods: [{ name: 'Chicken Stir Fry', category: 'Entree', ingredients: ing(['chicken breast', 'broccoli', 'bell pepper', 'soy sauce', 'rice']) }],
      },
      {
        // DAIRY — triggers poop at daysAgo(8, 7) = 12h later
        timestamp: daysAgo(9, 19, 0),
        foods: [{ name: 'Pizza Margherita', category: 'Pizza', ingredients: ing(['pizza dough', 'mozzarella cheese', 'tomato sauce', 'basil', 'olive oil']) }],
      },
      {
        timestamp: daysAgo(7, 12, 0),
        foods: [{ name: 'Turkey Sandwich', category: 'Sandwich', ingredients: ing(['turkey breast', 'sourdough bread', 'mustard', 'lettuce', 'tomato']) }],
      },
      {
        timestamp: daysAgo(6, 8, 0),
        foods: [{ name: 'Scrambled Eggs', category: 'Breakfast', ingredients: ing(['eggs', 'salt', 'pepper', 'olive oil']) }],
      },
      {
        timestamp: daysAgo(5, 12, 0),
        foods: [{ name: 'Lentil Soup', category: 'Soup', ingredients: ing(['lentils', 'carrots', 'celery', 'onion', 'vegetable broth']) }],
      },
      {
        // DAIRY — triggers poop at daysAgo(3, 6) = 12h later
        timestamp: daysAgo(4, 18, 0),
        foods: [{ name: 'Cheese Quesadilla', category: 'Mexican', ingredients: ing(['flour tortilla', 'cheddar cheese', 'cream', 'chicken breast']) }],
      },
      {
        timestamp: daysAgo(2, 12, 0),
        foods: [{ name: 'Grilled Chicken Rice Bowl', category: 'Bowl', ingredients: ing(['chicken breast', 'white rice', 'carrots', 'olive oil', 'salt']) }],
      },
    ],
    poops: [
      { timestamp: daysAgo(15, 22, 0), severity: '5', symptoms: symptoms(['bloating', 'gas']) },           // 34h after mac & cheese (day 16 noon)
      { timestamp: daysAgo(15, 8, 0), severity: '4', symptoms: symptoms([]) },                              // normal morning
      { timestamp: daysAgo(13, 6, 0), severity: '6', symptoms: symptoms(['bloating', 'gas', 'cramps']) },   // 12h after alfredo (day 14 6pm)
      { timestamp: daysAgo(12, 8, 0), severity: '3', symptoms: symptoms([]) },                              // normal morning
      { timestamp: daysAgo(10, 20, 0), severity: '5', symptoms: symptoms(['bloating', 'gas']) },             // 36h after yogurt (day 11 8am)
      { timestamp: daysAgo(9, 8, 0), severity: '4', symptoms: symptoms([]) },                               // normal morning
      { timestamp: daysAgo(8, 7, 0), severity: '6', symptoms: symptoms(['bloating', 'gas', 'urgency']) },   // 12h after pizza (day 9 7pm)
      { timestamp: daysAgo(6, 15, 0), severity: '3', symptoms: symptoms([]) },                              // normal afternoon
      { timestamp: daysAgo(3, 6, 0), severity: '5', symptoms: symptoms(['bloating', 'gas', 'cramps']) },    // 12h after quesadilla (day 4 6pm)
      { timestamp: daysAgo(1, 9, 0), severity: '4', symptoms: symptoms([]) },                               // normal morning
    ],
  };
}

// ── User 2: Confounded Triggers (Onion + Gluten) ────────────────────────────

function confoundedUser() {
  return {
    email: 'confounded@test.com',
    meals: [
      {
        // BOTH onion+gluten — triggers poop
        timestamp: daysAgo(16, 12, 0),
        foods: [{ name: 'Spaghetti Bolognese', category: 'Pasta', ingredients: ing(['spaghetti pasta', 'ground beef', 'tomato sauce', 'onion', 'garlic', 'olive oil']) }],
      },
      {
        // Gluten only, no onion — SAFE
        timestamp: daysAgo(15, 8, 0),
        foods: [{ name: 'Scrambled Eggs & Toast', category: 'Breakfast', ingredients: ing(['eggs', 'butter', 'white bread', 'salt']) }],
      },
      {
        timestamp: daysAgo(14, 12, 30),
        foods: [{ name: 'Rice and Chicken', category: 'Entree', ingredients: ing(['white rice', 'chicken thigh', 'soy sauce', 'ginger']) }],
      },
      {
        // BOTH — triggers poop at daysAgo(13, 6) = 12h later
        timestamp: daysAgo(14, 18, 0),
        foods: [{ name: 'French Onion Soup', category: 'Soup', ingredients: ing(['onion', 'beef broth', 'gruyere cheese', 'white bread', 'butter']) }],
      },
      {
        timestamp: daysAgo(12, 12, 0),
        foods: [{ name: 'Baked Potato', category: 'Lunch', ingredients: ing(['russet potato', 'butter', 'salt', 'chives']) }],
      },
      {
        // BOTH — triggers poop at daysAgo(11, 6, 30) = 11.5h later
        timestamp: daysAgo(12, 19, 0),
        foods: [{ name: 'Chicken Stir Fry with Noodles', category: 'Entree', ingredients: ing(['chicken breast', 'egg noodles', 'onion', 'bell pepper', 'soy sauce', 'garlic']) }],
      },
      {
        // Gluten only, no onion — SAFE
        timestamp: daysAgo(10, 8, 0),
        foods: [{ name: 'Peanut Butter Toast', category: 'Breakfast', ingredients: ing(['whole wheat bread', 'peanut butter']) }],
      },
      {
        timestamp: daysAgo(9, 12, 0),
        foods: [{ name: 'Rice and Black Beans', category: 'Lunch', ingredients: ing(['white rice', 'black beans', 'lime', 'cilantro', 'salt']) }],
      },
      {
        // BOTH — triggers poop at daysAgo(8, 6) = 11.5h later
        timestamp: daysAgo(9, 18, 30),
        foods: [{ name: 'Burger with Onion Rings', category: 'Dinner', ingredients: ing(['beef patty', 'burger bun', 'onion', 'lettuce', 'tomato', 'ketchup']) }],
      },
      {
        timestamp: daysAgo(7, 12, 0),
        foods: [{ name: 'Grilled Chicken Salad', category: 'Salad', ingredients: ing(['chicken breast', 'romaine lettuce', 'olive oil', 'lemon', 'cucumber']) }],
      },
      {
        // ONION only, NO gluten — triggers poop at daysAgo(6, 6) = 12h later
        timestamp: daysAgo(7, 18, 0),
        foods: [{ name: 'Caramelized Onion Frittata', category: 'Dinner', ingredients: ing(['eggs', 'onion', 'potatoes', 'olive oil', 'salt']) }],
      },
      {
        timestamp: daysAgo(5, 12, 0),
        foods: [{ name: 'Tuna Salad', category: 'Lunch', ingredients: ing(['canned tuna', 'mayonnaise', 'celery', 'lemon', 'salt']) }],
      },
      {
        // BOTH — triggers poop at daysAgo(4, 6) = 12h later
        timestamp: daysAgo(5, 18, 0),
        foods: [{ name: 'Pasta Primavera', category: 'Pasta', ingredients: ing(['penne pasta', 'onion', 'garlic', 'zucchini', 'tomato sauce', 'olive oil']) }],
      },
      {
        timestamp: daysAgo(2, 12, 0),
        foods: [{ name: 'Egg Fried Rice', category: 'Lunch', ingredients: ing(['white rice', 'eggs', 'green onion', 'soy sauce', 'sesame oil']) }],
      },
    ],
    poops: [
      { timestamp: daysAgo(15, 22, 0), severity: '6', symptoms: symptoms(['cramps', 'bloating', 'urgency']) },   // ~10h after bolognese
      { timestamp: daysAgo(14, 8, 0), severity: '4', symptoms: symptoms([]) },                                    // normal
      { timestamp: daysAgo(13, 6, 0), severity: '5', symptoms: symptoms(['cramps', 'bloating', 'gas']) },         // ~12h after french onion
      { timestamp: daysAgo(12, 8, 0), severity: '3', symptoms: symptoms([]) },                                    // normal
      { timestamp: daysAgo(11, 6, 30), severity: '6', symptoms: symptoms(['cramps', 'urgency', 'nausea']) },      // ~11.5h after stir fry
      { timestamp: daysAgo(8, 6, 0), severity: '5', symptoms: symptoms(['cramps', 'bloating']) },                 // ~11.5h after burger
      { timestamp: daysAgo(7, 8, 0), severity: '3', symptoms: symptoms([]) },                                     // normal
      { timestamp: daysAgo(6, 6, 0), severity: '5', symptoms: symptoms(['cramps', 'gas', 'bloating']) },          // ~12h after frittata (onion only!)
      { timestamp: daysAgo(4, 6, 0), severity: '6', symptoms: symptoms(['cramps', 'urgency', 'bloating']) },      // ~12h after primavera
    ],
  };
}

// ── User 3: Healthy Gut (No Triggers) ────────────────────────────────────────

function healthyUser() {
  return {
    email: 'healthy@test.com',
    meals: [
      {
        timestamp: daysAgo(14, 8, 0),
        foods: [{ name: 'Cereal with Milk', category: 'Breakfast', ingredients: ing(['cereal', 'milk', 'banana']) }],
      },
      {
        timestamp: daysAgo(13, 12, 0),
        foods: [{ name: 'Turkey Club Sandwich', category: 'Sandwich', ingredients: ing(['white bread', 'turkey breast', 'bacon', 'lettuce', 'tomato', 'mayonnaise']) }],
      },
      {
        timestamp: daysAgo(12, 18, 30),
        foods: [{ name: 'Pasta with Marinara', category: 'Pasta', ingredients: ing(['spaghetti pasta', 'tomato sauce', 'garlic', 'olive oil', 'parmesan cheese']) }],
      },
      {
        timestamp: daysAgo(11, 8, 0),
        foods: [{ name: 'Greek Yogurt Bowl', category: 'Breakfast', ingredients: ing(['greek yogurt', 'granola', 'honey', 'walnuts']) }],
      },
      {
        timestamp: daysAgo(10, 12, 0),
        foods: [{ name: 'Grilled Chicken Wrap', category: 'Wrap', ingredients: ing(['flour tortilla', 'chicken breast', 'onion', 'bell pepper', 'sour cream']) }],
      },
      {
        timestamp: daysAgo(9, 18, 0),
        foods: [{ name: 'Salmon with Rice', category: 'Entree', ingredients: ing(['salmon', 'white rice', 'soy sauce', 'broccoli']) }],
      },
      {
        timestamp: daysAgo(8, 8, 0),
        foods: [{ name: 'Pancakes', category: 'Breakfast', ingredients: ing(['flour', 'eggs', 'milk', 'butter', 'maple syrup']) }],
      },
      {
        timestamp: daysAgo(7, 12, 0),
        foods: [{ name: 'Caesar Salad', category: 'Salad', ingredients: ing(['romaine lettuce', 'parmesan cheese', 'croutons', 'caesar dressing', 'chicken breast']) }],
      },
      {
        timestamp: daysAgo(6, 18, 0),
        foods: [{ name: 'Steak and Potatoes', category: 'Dinner', ingredients: ing(['ribeye steak', 'russet potato', 'butter', 'salt', 'asparagus']) }],
      },
      {
        timestamp: daysAgo(5, 12, 0),
        foods: [{ name: 'Burrito Bowl', category: 'Bowl', ingredients: ing(['white rice', 'black beans', 'chicken breast', 'onion', 'salsa', 'sour cream']) }],
      },
      {
        timestamp: daysAgo(3, 12, 0),
        foods: [{ name: 'BLT Sandwich', category: 'Sandwich', ingredients: ing(['white bread', 'bacon', 'lettuce', 'tomato', 'mayonnaise']) }],
      },
      {
        timestamp: daysAgo(2, 18, 0),
        foods: [{ name: 'Pizza Slice', category: 'Pizza', ingredients: ing(['pizza dough', 'mozzarella cheese', 'tomato sauce', 'pepperoni']) }],
      },
    ],
    poops: [
      { timestamp: daysAgo(13, 8, 30), severity: '4', symptoms: symptoms([]) },
      { timestamp: daysAgo(11, 9, 0), severity: '3', symptoms: symptoms([]) },
      { timestamp: daysAgo(10, 8, 0), severity: '4', symptoms: symptoms([]) },
      { timestamp: daysAgo(8, 14, 0), severity: '3', symptoms: symptoms(['gas']) },
      { timestamp: daysAgo(6, 8, 0), severity: '4', symptoms: symptoms([]) },
      { timestamp: daysAgo(4, 9, 0), severity: '3', symptoms: symptoms([]) },
      { timestamp: daysAgo(1, 8, 30), severity: '4', symptoms: symptoms([]) },
    ],
  };
}

// ── User 4: Severe IBS — Multiple Triggers ───────────────────────────────────

function severeUser() {
  return {
    email: 'severe@test.com',
    meals: [
      {
        timestamp: daysAgo(21, 12, 0),
        foods: [{ name: 'Plain Rice and Chicken', category: 'Entree', ingredients: ing(['white rice', 'chicken breast', 'salt']) }],
      },
      {
        // GARLIC — triggers poop at daysAgo(20, 6) = 12h later
        timestamp: daysAgo(21, 18, 0),
        foods: [{ name: 'Garlic Bread with Pasta', category: 'Dinner', ingredients: ing(['pasta', 'garlic', 'butter', 'olive oil', 'tomato sauce']) }],
      },
      {
        timestamp: daysAgo(19, 12, 0),
        foods: [{ name: 'Banana and Oatmeal', category: 'Breakfast', ingredients: ing(['banana', 'oats', 'water', 'honey']) }],
      },
      {
        // GARLIC + DAIRY — triggers poop at daysAgo(18, 6) = 11.5h later
        timestamp: daysAgo(19, 18, 30),
        foods: [{ name: 'Creamy Garlic Shrimp', category: 'Dinner', ingredients: ing(['shrimp', 'garlic', 'cream', 'butter', 'parsley', 'white rice']) }],
      },
      {
        timestamp: daysAgo(17, 12, 0),
        foods: [{ name: 'Plain Baked Potato', category: 'Lunch', ingredients: ing(['russet potato', 'salt', 'olive oil']) }],
      },
      {
        // MULTIPLE: garlic + dairy + onion + spicy — triggers poop at daysAgo(16, 8) = 14h later
        timestamp: daysAgo(17, 18, 0),
        foods: [{ name: 'Chicken Tikka Masala', category: 'Dinner', ingredients: ing(['chicken breast', 'cream', 'onion', 'garlic', 'tomato sauce', 'chili flakes', 'white rice']) }],
      },
      {
        timestamp: daysAgo(15, 12, 0),
        foods: [{ name: 'Steamed Rice and Vegetables', category: 'Lunch', ingredients: ing(['white rice', 'carrots', 'green beans', 'salt']) }],
      },
      {
        // SPICY — triggers poop at daysAgo(14, 6) = 12h later
        timestamp: daysAgo(15, 18, 0),
        foods: [{ name: 'Spicy Ramen', category: 'Dinner', ingredients: ing(['ramen noodles', 'hot sauce', 'egg', 'green onion', 'soy sauce']) }],
      },
      {
        timestamp: daysAgo(13, 8, 0),
        foods: [{ name: 'Toast with Peanut Butter', category: 'Breakfast', ingredients: ing(['white bread', 'peanut butter']) }],
      },
      {
        // ONION — triggers poop at daysAgo(13, 6) = 12h later
        timestamp: daysAgo(14, 18, 0),
        foods: [{ name: 'Onion Rings and Burger', category: 'Dinner', ingredients: ing(['onion', 'flour', 'beef patty', 'burger bun', 'ketchup']) }],
      },
      {
        timestamp: daysAgo(12, 12, 0),
        foods: [{ name: 'Chicken and Rice Soup', category: 'Soup', ingredients: ing(['chicken breast', 'white rice', 'carrots', 'celery', 'chicken broth']) }],
      },
      {
        // DAIRY + GARLIC — triggers poop at daysAgo(11, 6) = 12h later
        timestamp: daysAgo(12, 18, 0),
        foods: [{ name: 'Cheese Pizza', category: 'Pizza', ingredients: ing(['pizza dough', 'mozzarella cheese', 'tomato sauce', 'garlic']) }],
      },
      {
        timestamp: daysAgo(10, 12, 0),
        foods: [{ name: 'Plain Grilled Chicken', category: 'Lunch', ingredients: ing(['chicken breast', 'salt', 'lemon']) }],
      },
      {
        // ONION + DAIRY — triggers poop at daysAgo(9, 8) = 13.5h later
        timestamp: daysAgo(10, 18, 30),
        foods: [{ name: 'Creamy Onion Soup', category: 'Soup', ingredients: ing(['onion', 'cream', 'butter', 'chicken broth', 'white bread']) }],
      },
      {
        timestamp: daysAgo(8, 12, 0),
        foods: [{ name: 'Banana Smoothie', category: 'Drink', ingredients: ing(['banana', 'water', 'ice', 'honey']) }],
      },
      {
        // GARLIC + DAIRY — triggers poop at daysAgo(7, 6) = 12h later
        timestamp: daysAgo(8, 18, 0),
        foods: [{ name: 'Garlic Butter Steak', category: 'Dinner', ingredients: ing(['ribeye steak', 'garlic', 'butter', 'salt', 'russet potato']) }],
      },
      {
        timestamp: daysAgo(6, 12, 0),
        foods: [{ name: 'Egg Fried Rice', category: 'Lunch', ingredients: ing(['white rice', 'eggs', 'soy sauce', 'salt']) }],
      },
      {
        // MULTIPLE: spicy + onion + garlic — triggers poop at daysAgo(5, 8) = 14h later
        timestamp: daysAgo(6, 18, 0),
        foods: [{ name: 'Spicy Thai Curry', category: 'Dinner', ingredients: ing(['chicken breast', 'coconut milk', 'chili flakes', 'onion', 'garlic', 'white rice']) }],
      },
      {
        timestamp: daysAgo(4, 12, 0),
        foods: [{ name: 'Plain Oatmeal', category: 'Breakfast', ingredients: ing(['oats', 'water', 'salt']) }],
      },
      {
        // GARLIC + DAIRY — triggers poop at daysAgo(3, 6) = 12h later
        timestamp: daysAgo(4, 18, 0),
        foods: [{ name: 'Cheesy Garlic Bread', category: 'Snack', ingredients: ing(['white bread', 'garlic', 'mozzarella cheese', 'butter']) }],
      },
    ],
    poops: [
      { timestamp: daysAgo(20, 6, 0), severity: '6', symptoms: symptoms(['cramps', 'urgency', 'bloating']) },           // garlic bread
      { timestamp: daysAgo(19, 8, 0), severity: '4', symptoms: symptoms(['gas']) },                                      // normal-ish
      { timestamp: daysAgo(18, 6, 0), severity: '7', symptoms: symptoms(['cramps', 'urgency', 'nausea', 'bloating']) },  // garlic shrimp
      { timestamp: daysAgo(17, 9, 0), severity: '5', symptoms: symptoms(['bloating']) },                                 // residual
      { timestamp: daysAgo(16, 8, 0), severity: '7', symptoms: symptoms(['cramps', 'urgency', 'bloating', 'nausea']) },  // tikka masala
      { timestamp: daysAgo(15, 8, 0), severity: '4', symptoms: symptoms([]) },                                           // normal
      { timestamp: daysAgo(14, 6, 0), severity: '6', symptoms: symptoms(['cramps', 'urgency', 'gas']) },                 // spicy ramen
      { timestamp: daysAgo(13, 6, 0), severity: '6', symptoms: symptoms(['cramps', 'bloating', 'urgency']) },            // onion rings
      { timestamp: daysAgo(11, 6, 0), severity: '6', symptoms: symptoms(['cramps', 'urgency', 'bloating']) },            // cheese pizza
      { timestamp: daysAgo(10, 8, 0), severity: '4', symptoms: symptoms([]) },                                           // normal
      { timestamp: daysAgo(9, 8, 0), severity: '7', symptoms: symptoms(['cramps', 'urgency', 'bloating', 'nausea']) },   // onion soup
      { timestamp: daysAgo(7, 6, 0), severity: '6', symptoms: symptoms(['cramps', 'urgency', 'gas']) },                  // garlic steak
      { timestamp: daysAgo(5, 8, 0), severity: '7', symptoms: symptoms(['cramps', 'urgency', 'bloating', 'fatigue']) },  // thai curry
      { timestamp: daysAgo(4, 8, 0), severity: '5', symptoms: symptoms(['bloating']) },                                  // residual
      { timestamp: daysAgo(3, 6, 0), severity: '6', symptoms: symptoms(['cramps', 'urgency', 'bloating']) },             // garlic bread
    ],
  };
}

// ── User 5: Minimal Data (Edge Case) ─────────────────────────────────────────

function minimalUser() {
  return {
    email: 'minimal@test.com',
    meals: [
      {
        timestamp: daysAgo(3, 12, 0),
        foods: [{ name: 'Chicken Salad', category: 'Salad', ingredients: ing(['chicken breast', 'romaine lettuce', 'olive oil', 'lemon']) }],
      },
      {
        timestamp: daysAgo(2, 18, 0),
        foods: [{ name: 'Cheese Quesadilla', category: 'Mexican', ingredients: ing(['flour tortilla', 'cheddar cheese', 'chicken breast', 'olive oil']) }],
      },
      {
        timestamp: daysAgo(1, 12, 0),
        foods: [{ name: 'Mac and Cheese', category: 'Pasta', ingredients: ing(['pasta', 'cheddar cheese', 'milk', 'butter']) }],
      },
    ],
    poops: [
      { timestamp: daysAgo(2, 8, 0), severity: '5', symptoms: symptoms(['bloating', 'cramps']) },  // window catches meals 1
      { timestamp: daysAgo(1, 7, 0), severity: '4', symptoms: symptoms([]) },                      // window catches meal 2
    ],
  };
}

// ── User 6: Consistent Timing Pattern ────────────────────────────────────────

function timingUser() {
  // Strategy: 5 "spicy events" where meal is at 7pm and poop follows at 6am = 11h lag.
  // Safe meals are placed > 36h before the next poop so they are NOT in any window.
  return {
    email: 'timing@test.com',
    meals: [
      // Safe: daysAgo(14, 12) -> next poop is daysAgo(13, 6) = 30h later. That's IN window (6-36h).
      // Move safe meals to mornings just after a triggered poop so > 36h to next event.
      {
        // Safe meal — 42h before next poop (event A poop)
        timestamp: daysAgo(15, 12, 0),
        foods: [{ name: 'Plain Rice and Chicken', category: 'Entree', ingredients: ing(['white rice', 'chicken breast', 'salt', 'olive oil']) }],
      },
      {
        // SPICY EVENT A — triggers poop at daysAgo(13, 6) = 11h later
        timestamp: daysAgo(14, 19, 0),
        foods: [{ name: 'Spicy Chicken Wings', category: 'Appetizer', ingredients: ing(['chicken wings', 'hot sauce', 'cayenne', 'butter']) }],
      },
      {
        // Safe meal — daysAgo(11, 12) -> next poop is daysAgo(10, 6) = 30h. IN window. Problem.
        // Instead place at daysAgo(12, 6) -> next poop is daysAgo(10, 6) = 48h. SAFE.
        timestamp: daysAgo(12, 6, 0),
        foods: [{ name: 'Turkey Sandwich', category: 'Sandwich', ingredients: ing(['white bread', 'turkey breast', 'mustard', 'lettuce']) }],
      },
      {
        // SPICY EVENT B — triggers poop at daysAgo(10, 6) = 11h later
        timestamp: daysAgo(11, 19, 0),
        foods: [{ name: 'Spicy Beef Tacos', category: 'Mexican', ingredients: ing(['corn tortilla', 'ground beef', 'chili pepper', 'hot sauce', 'salsa']) }],
      },
      {
        // Safe meal — daysAgo(9, 6) -> next poop is daysAgo(8, 6) = 24h. IN window.
        // Place at daysAgo(10, 6) -> but that conflicts with event B meal at daysAgo(10,19).
        // Place at daysAgo(9, 12) -> next poop is daysAgo(8, 6) = 30h. IN window.
        // Place at daysAgo(10, 5) -> next poop is daysAgo(10, 6) = 1h. NOT in window (< 6h). SAFE.
        timestamp: daysAgo(10, 5, 0),
        foods: [{ name: 'Scrambled Eggs and Toast', category: 'Breakfast', ingredients: ing(['eggs', 'white bread', 'salt', 'butter', 'olive oil']) }],
      },
      {
        // SPICY EVENT C — triggers poop at daysAgo(8, 6) = 11h later
        timestamp: daysAgo(9, 19, 0),
        foods: [{ name: 'Spicy Thai Noodles', category: 'Dinner', ingredients: ing(['rice noodles', 'hot sauce', 'chili pepper', 'shrimp', 'soy sauce']) }],
      },
      {
        // Safe meal — place right after event C poop
        // daysAgo(8, 5) -> next poop is daysAgo(8, 6) = 1h. NOT in window. SAFE.
        timestamp: daysAgo(8, 5, 0),
        foods: [{ name: 'Chicken Noodle Soup', category: 'Soup', ingredients: ing(['chicken breast', 'egg noodles', 'carrots', 'celery', 'chicken broth']) }],
      },
      {
        // SPICY EVENT D — triggers poop at daysAgo(5, 6) = 11h later
        timestamp: daysAgo(6, 19, 0),
        foods: [{ name: 'Nashville Hot Chicken', category: 'Entree', ingredients: ing(['chicken breast', 'cayenne', 'hot sauce', 'flour', 'pickles']) }],
      },
      {
        // Safe meal — place right after event D poop
        // daysAgo(5, 5) -> next poop is daysAgo(5, 6) = 1h. SAFE.
        timestamp: daysAgo(5, 5, 0),
        foods: [{ name: 'Grilled Cheese Sandwich', category: 'Sandwich', ingredients: ing(['white bread', 'cheddar cheese', 'butter']) }],
      },
      {
        // Safe meal — daysAgo(4, 6) -> next poop is daysAgo(3, 6) = 24h. IN window.
        // Place at daysAgo(5, 4) -> daysAgo(5, 6) = 2h. SAFE.
        timestamp: daysAgo(5, 4, 0),
        foods: [{ name: 'Plain Pasta', category: 'Lunch', ingredients: ing(['pasta', 'olive oil', 'salt', 'parmesan cheese']) }],
      },
      {
        // SPICY EVENT E — triggers poop at daysAgo(3, 6) = 11h later
        timestamp: daysAgo(4, 19, 0),
        foods: [{ name: 'Spicy Sausage Pizza', category: 'Pizza', ingredients: ing(['pizza dough', 'mozzarella cheese', 'chili pepper', 'italian sausage', 'tomato sauce']) }],
      },
      {
        // Safe meal — daysAgo(2, 6) -> no upcoming poop in range. SAFE.
        timestamp: daysAgo(2, 6, 0),
        foods: [{ name: 'Egg Fried Rice', category: 'Lunch', ingredients: ing(['white rice', 'eggs', 'soy sauce', 'salt']) }],
      },
    ],
    poops: [
      // Spicy-triggered poops (all 11h lag, Bristol 5-6)
      { timestamp: daysAgo(13, 6, 0), severity: '6', symptoms: symptoms(['cramps', 'urgency', 'gas']) },   // Event A: 11h after wings
      { timestamp: daysAgo(10, 6, 0), severity: '5', symptoms: symptoms(['cramps', 'urgency']) },          // Event B: 11h after tacos
      { timestamp: daysAgo(8, 6, 0), severity: '6', symptoms: symptoms(['cramps', 'urgency', 'gas']) },    // Event C: 11h after thai noodles
      { timestamp: daysAgo(5, 6, 0), severity: '5', symptoms: symptoms(['cramps', 'urgency']) },           // Event D: 11h after hot chicken
      { timestamp: daysAgo(3, 6, 0), severity: '6', symptoms: symptoms(['cramps', 'urgency', 'gas']) },    // Event E: 11h after pizza

      // Normal poops (not linked to any meal — occur > 36h after nearest safe meal)
      { timestamp: daysAgo(14, 8, 0), severity: '3', symptoms: symptoms([]) },
      { timestamp: daysAgo(6, 8, 0), severity: '4', symptoms: symptoms([]) },
      { timestamp: daysAgo(1, 8, 0), severity: '3', symptoms: symptoms([]) },
    ],
  };
}

// ── User 7: Dietary Improvement (Before/After) ──────────────────────────────

function improvementUser() {
  // Phase 1 (days 21-12): Heavy dairy/garlic diet → Bristol 5-7, lots of symptoms
  // Phase 2 (days 10-1):  Switched to clean eating → Bristol 3-4, no symptoms
  // The AI should note the dietary change and improvement.
  //
  // Timing: Phase 1 meals at 6pm, poops 12h later at 6am next day.
  // Phase 2 meals at noon, poops spaced every 5+ days so most meals are "safe".
  return {
    email: 'improvement@test.com',
    meals: [
      // ── Phase 1: Dairy & garlic heavy (all trigger poops) ──
      {
        timestamp: daysAgo(21, 18, 0),
        foods: [{ name: 'Creamy Garlic Pasta', category: 'Pasta', ingredients: ing(['cream', 'garlic', 'pasta', 'butter', 'parmesan cheese']) }],
      },
      {
        timestamp: daysAgo(20, 18, 0),
        foods: [{ name: 'Cheese Pizza', category: 'Pizza', ingredients: ing(['mozzarella cheese', 'pizza dough', 'tomato sauce', 'garlic']) }],
      },
      {
        timestamp: daysAgo(19, 18, 0),
        foods: [{ name: 'Shrimp Scampi', category: 'Pasta', ingredients: ing(['shrimp', 'garlic', 'butter', 'cream', 'pasta']) }],
      },
      {
        timestamp: daysAgo(18, 18, 0),
        foods: [{ name: 'Mac and Cheese', category: 'Pasta', ingredients: ing(['cheddar cheese', 'milk', 'butter', 'pasta']) }],
      },
      {
        timestamp: daysAgo(17, 18, 0),
        foods: [{ name: 'Cream of Mushroom Soup', category: 'Soup', ingredients: ing(['cream', 'mushrooms', 'butter', 'garlic', 'bread']) }],
      },
      {
        timestamp: daysAgo(16, 18, 0),
        foods: [{ name: 'Beef Quesadilla', category: 'Mexican', ingredients: ing(['cheddar cheese', 'flour tortilla', 'sour cream', 'ground beef']) }],
      },
      {
        timestamp: daysAgo(15, 18, 0),
        foods: [{ name: 'Garlic Cheese Bread', category: 'Snack', ingredients: ing(['garlic', 'butter', 'bread', 'parmesan cheese']) }],
      },
      {
        timestamp: daysAgo(14, 18, 0),
        foods: [{ name: 'Four Cheese Pasta', category: 'Pasta', ingredients: ing(['mozzarella cheese', 'cheddar cheese', 'cream', 'parmesan cheese', 'pasta']) }],
      },
      {
        timestamp: daysAgo(13, 18, 0),
        foods: [{ name: 'Creamy Tomato Soup', category: 'Soup', ingredients: ing(['cream', 'tomato sauce', 'garlic', 'butter', 'bread']) }],
      },
      {
        timestamp: daysAgo(12, 18, 0),
        foods: [{ name: 'Ice Cream Sundae', category: 'Dessert', ingredients: ing(['ice cream', 'milk', 'chocolate', 'whipped cream']) }],
      },

      // ── Phase 2: Clean eating (mostly safe, no dairy/garlic) ──
      {
        timestamp: daysAgo(10, 12, 0),
        foods: [{ name: 'Grilled Chicken Rice Bowl', category: 'Bowl', ingredients: ing(['chicken breast', 'white rice', 'olive oil', 'lemon', 'salt']) }],
      },
      {
        // This meal will be "suspect" for P11, but with Bristol 4 (normal)
        timestamp: daysAgo(9, 12, 0),
        foods: [{ name: 'Salmon with Broccoli', category: 'Entree', ingredients: ing(['salmon', 'broccoli', 'white rice', 'soy sauce', 'ginger']) }],
      },
      {
        timestamp: daysAgo(8, 12, 0),
        foods: [{ name: 'Oat Milk Smoothie Bowl', category: 'Breakfast', ingredients: ing(['oat milk', 'banana', 'oats', 'blueberries', 'honey']) }],
      },
      {
        timestamp: daysAgo(7, 12, 0),
        foods: [{ name: 'Turkey Stir Fry', category: 'Entree', ingredients: ing(['turkey breast', 'bell pepper', 'carrots', 'soy sauce', 'white rice']) }],
      },
      {
        timestamp: daysAgo(6, 12, 0),
        foods: [{ name: 'Baked Chicken and Sweet Potato', category: 'Entree', ingredients: ing(['chicken breast', 'sweet potato', 'olive oil', 'lemon', 'salt']) }],
      },
      {
        timestamp: daysAgo(5, 12, 0),
        foods: [{ name: 'Rice Noodle Soup', category: 'Soup', ingredients: ing(['rice noodles', 'chicken broth', 'carrots', 'ginger', 'salt']) }],
      },
      {
        timestamp: daysAgo(4, 12, 0),
        foods: [{ name: 'Grilled Fish Tacos', category: 'Mexican', ingredients: ing(['white fish', 'corn tortilla', 'cabbage', 'lime', 'avocado']) }],
      },
      {
        // This meal will be "suspect" for P12, but with Bristol 3 (normal)
        timestamp: daysAgo(3, 12, 0),
        foods: [{ name: 'Quinoa Buddha Bowl', category: 'Bowl', ingredients: ing(['quinoa', 'chickpeas', 'cucumber', 'avocado', 'lemon']) }],
      },
    ],
    poops: [
      // ── Phase 1 poops: all bad, 12h after each meal ──
      { timestamp: daysAgo(20, 6, 0), severity: '6', symptoms: symptoms(['cramps', 'bloating']) },
      { timestamp: daysAgo(19, 6, 0), severity: '5', symptoms: symptoms(['gas', 'bloating']) },
      { timestamp: daysAgo(18, 6, 0), severity: '6', symptoms: symptoms(['cramps', 'urgency']) },
      { timestamp: daysAgo(17, 6, 0), severity: '7', symptoms: symptoms(['cramps', 'urgency', 'nausea']) },
      { timestamp: daysAgo(16, 6, 0), severity: '5', symptoms: symptoms(['bloating', 'gas']) },
      { timestamp: daysAgo(15, 6, 0), severity: '6', symptoms: symptoms(['cramps', 'urgency', 'bloating']) },
      { timestamp: daysAgo(14, 6, 0), severity: '5', symptoms: symptoms(['bloating', 'gas']) },
      { timestamp: daysAgo(13, 6, 0), severity: '7', symptoms: symptoms(['cramps', 'urgency', 'nausea']) },
      { timestamp: daysAgo(12, 6, 0), severity: '6', symptoms: symptoms(['cramps', 'bloating', 'urgency']) },
      { timestamp: daysAgo(11, 6, 0), severity: '5', symptoms: symptoms(['bloating', 'gas']) },

      // ── Phase 2 poops: normal, infrequent (only 2 over 10 days) ──
      { timestamp: daysAgo(8, 8, 0), severity: '4', symptoms: symptoms([]) },   // catches M12 (salmon) at 20h lag
      { timestamp: daysAgo(2, 8, 0), severity: '3', symptoms: symptoms([]) },   // catches M18 (quinoa) at 20h lag
    ],
  };
}

// ── User 8: High-Frequency Baseline (3-4 poops/day normal, 7+ on flares) ────

function highFrequencyUser() {
  // This user has IBS-D with a high baseline poop frequency.
  // Normal days: 3 poops/day, Bristol 4-5, minimal symptoms.
  // Flare days (after dairy): 6-7 poops/day, Bristol 6-7, severe symptoms.
  //
  // The challenge: with 3 baseline poops/day, almost every meal is "suspect"
  // because there's always a poop 6-36h later. The AI must use Bristol types
  // and symptom severity to distinguish triggers from safe foods.
  //
  // Days 14-8: Mixed diet with 2 dairy flare events and baseline days between.
  // Days 7-1: Clean diet, consistent baseline.

  const meals = [];
  const poops = [];

  // ── Baseline days with clean eating ──
  // Days 14, 13: baseline (no triggers)
  meals.push({
    timestamp: daysAgo(14, 8, 0),
    foods: [{ name: 'Oatmeal with Banana', category: 'Breakfast', ingredients: ing(['oats', 'banana', 'water', 'honey']) }],
  });
  meals.push({
    timestamp: daysAgo(14, 13, 0),
    foods: [{ name: 'Chicken Rice Bowl', category: 'Bowl', ingredients: ing(['chicken breast', 'white rice', 'olive oil', 'salt']) }],
  });
  meals.push({
    timestamp: daysAgo(13, 8, 0),
    foods: [{ name: 'Eggs and Toast', category: 'Breakfast', ingredients: ing(['eggs', 'white bread', 'olive oil', 'salt']) }],
  });
  meals.push({
    timestamp: daysAgo(13, 13, 0),
    foods: [{ name: 'Turkey Wrap', category: 'Wrap', ingredients: ing(['turkey breast', 'flour tortilla', 'lettuce', 'mustard']) }],
  });

  // Baseline poops for days 14, 13 (3/day, Bristol 4-5, mild or no symptoms)
  poops.push({ timestamp: daysAgo(14, 7, 0), severity: '4', symptoms: symptoms([]) });
  poops.push({ timestamp: daysAgo(14, 12, 0), severity: '5', symptoms: symptoms([]) });
  poops.push({ timestamp: daysAgo(14, 18, 0), severity: '4', symptoms: symptoms([]) });
  poops.push({ timestamp: daysAgo(13, 7, 0), severity: '4', symptoms: symptoms([]) });
  poops.push({ timestamp: daysAgo(13, 12, 0), severity: '5', symptoms: symptoms([]) });
  poops.push({ timestamp: daysAgo(13, 18, 0), severity: '4', symptoms: symptoms([]) });

  // ── FLARE EVENT 1: Day 12 evening → Day 11 flare ──
  meals.push({
    timestamp: daysAgo(12, 8, 0),
    foods: [{ name: 'Rice and Vegetables', category: 'Lunch', ingredients: ing(['white rice', 'carrots', 'broccoli', 'soy sauce']) }],
  });
  meals.push({
    // DAIRY TRIGGER
    timestamp: daysAgo(12, 18, 0),
    foods: [{ name: 'Creamy Garlic Pasta', category: 'Pasta', ingredients: ing(['cream', 'garlic', 'pasta', 'butter', 'parmesan cheese']) }],
  });

  // Day 12 baseline poops (before flare)
  poops.push({ timestamp: daysAgo(12, 7, 0), severity: '4', symptoms: symptoms([]) });
  poops.push({ timestamp: daysAgo(12, 12, 0), severity: '5', symptoms: symptoms([]) });
  poops.push({ timestamp: daysAgo(12, 17, 0), severity: '4', symptoms: symptoms([]) });

  // Day 11 FLARE poops (6-7 poops, Bristol 6-7, severe symptoms)
  poops.push({ timestamp: daysAgo(11, 5, 0), severity: '6', symptoms: symptoms(['cramps', 'urgency']) });
  poops.push({ timestamp: daysAgo(11, 7, 0), severity: '7', symptoms: symptoms(['cramps', 'urgency', 'nausea']) });
  poops.push({ timestamp: daysAgo(11, 9, 0), severity: '6', symptoms: symptoms(['cramps', 'bloating']) });
  poops.push({ timestamp: daysAgo(11, 12, 0), severity: '7', symptoms: symptoms(['urgency', 'cramps']) });
  poops.push({ timestamp: daysAgo(11, 15, 0), severity: '6', symptoms: symptoms(['bloating', 'urgency']) });
  poops.push({ timestamp: daysAgo(11, 18, 0), severity: '6', symptoms: symptoms(['cramps']) });
  poops.push({ timestamp: daysAgo(11, 21, 0), severity: '5', symptoms: symptoms(['bloating']) });

  // Day 11 safe meal (recovery food during flare)
  meals.push({
    timestamp: daysAgo(11, 13, 0),
    foods: [{ name: 'Plain White Rice', category: 'Side', ingredients: ing(['white rice', 'salt']) }],
  });

  // ── Recovery days 10, 9: back to baseline ──
  meals.push({
    timestamp: daysAgo(10, 8, 0),
    foods: [{ name: 'Banana Oatmeal', category: 'Breakfast', ingredients: ing(['oats', 'banana', 'honey', 'water']) }],
  });
  meals.push({
    timestamp: daysAgo(10, 13, 0),
    foods: [{ name: 'Grilled Chicken Salad', category: 'Salad', ingredients: ing(['chicken breast', 'romaine lettuce', 'olive oil', 'lemon']) }],
  });
  meals.push({
    timestamp: daysAgo(9, 8, 0),
    foods: [{ name: 'Scrambled Eggs', category: 'Breakfast', ingredients: ing(['eggs', 'olive oil', 'salt']) }],
  });
  meals.push({
    timestamp: daysAgo(9, 13, 0),
    foods: [{ name: 'Salmon Rice Bowl', category: 'Bowl', ingredients: ing(['salmon', 'white rice', 'soy sauce', 'ginger']) }],
  });

  // Baseline poops days 10, 9
  poops.push({ timestamp: daysAgo(10, 7, 0), severity: '5', symptoms: symptoms(['bloating']) });
  poops.push({ timestamp: daysAgo(10, 12, 0), severity: '4', symptoms: symptoms([]) });
  poops.push({ timestamp: daysAgo(10, 18, 0), severity: '4', symptoms: symptoms([]) });
  poops.push({ timestamp: daysAgo(9, 7, 0), severity: '4', symptoms: symptoms([]) });
  poops.push({ timestamp: daysAgo(9, 12, 0), severity: '4', symptoms: symptoms([]) });
  poops.push({ timestamp: daysAgo(9, 18, 0), severity: '4', symptoms: symptoms([]) });

  // ── FLARE EVENT 2: Day 8 evening → Day 7 flare ──
  meals.push({
    timestamp: daysAgo(8, 8, 0),
    foods: [{ name: 'Turkey Sandwich', category: 'Sandwich', ingredients: ing(['turkey breast', 'white bread', 'lettuce', 'mustard']) }],
  });
  meals.push({
    // DAIRY TRIGGER
    timestamp: daysAgo(8, 18, 0),
    foods: [{ name: 'Four Cheese Pizza', category: 'Pizza', ingredients: ing(['mozzarella cheese', 'cheddar cheese', 'cream', 'parmesan cheese', 'pizza dough']) }],
  });

  // Day 8 baseline poops
  poops.push({ timestamp: daysAgo(8, 7, 0), severity: '4', symptoms: symptoms([]) });
  poops.push({ timestamp: daysAgo(8, 12, 0), severity: '4', symptoms: symptoms([]) });
  poops.push({ timestamp: daysAgo(8, 17, 0), severity: '4', symptoms: symptoms([]) });

  // Day 7 FLARE poops
  poops.push({ timestamp: daysAgo(7, 5, 0), severity: '7', symptoms: symptoms(['cramps', 'urgency', 'nausea']) });
  poops.push({ timestamp: daysAgo(7, 7, 0), severity: '6', symptoms: symptoms(['cramps', 'urgency']) });
  poops.push({ timestamp: daysAgo(7, 9, 0), severity: '7', symptoms: symptoms(['urgency', 'bloating']) });
  poops.push({ timestamp: daysAgo(7, 12, 0), severity: '6', symptoms: symptoms(['cramps', 'bloating']) });
  poops.push({ timestamp: daysAgo(7, 15, 0), severity: '6', symptoms: symptoms(['urgency']) });
  poops.push({ timestamp: daysAgo(7, 18, 0), severity: '5', symptoms: symptoms(['bloating']) });

  // Day 7 recovery meal
  meals.push({
    timestamp: daysAgo(7, 13, 0),
    foods: [{ name: 'Chicken Broth and Rice', category: 'Soup', ingredients: ing(['chicken broth', 'white rice', 'salt', 'ginger']) }],
  });

  // ── Clean days 6-1: no triggers, baseline poops ──
  meals.push({
    timestamp: daysAgo(6, 8, 0),
    foods: [{ name: 'Oatmeal', category: 'Breakfast', ingredients: ing(['oats', 'banana', 'honey', 'water']) }],
  });
  meals.push({
    timestamp: daysAgo(6, 13, 0),
    foods: [{ name: 'Chicken Stir Fry', category: 'Entree', ingredients: ing(['chicken breast', 'bell pepper', 'carrots', 'soy sauce', 'white rice']) }],
  });
  meals.push({
    timestamp: daysAgo(5, 8, 0),
    foods: [{ name: 'Eggs and Avocado', category: 'Breakfast', ingredients: ing(['eggs', 'avocado', 'salt', 'olive oil']) }],
  });
  meals.push({
    timestamp: daysAgo(5, 13, 0),
    foods: [{ name: 'Grilled Salmon', category: 'Entree', ingredients: ing(['salmon', 'olive oil', 'lemon', 'white rice']) }],
  });
  meals.push({
    timestamp: daysAgo(4, 8, 0),
    foods: [{ name: 'Banana Smoothie', category: 'Drink', ingredients: ing(['banana', 'oat milk', 'oats', 'honey']) }],
  });
  meals.push({
    timestamp: daysAgo(4, 13, 0),
    foods: [{ name: 'Turkey Rice Bowl', category: 'Bowl', ingredients: ing(['turkey breast', 'white rice', 'carrots', 'soy sauce']) }],
  });
  meals.push({
    timestamp: daysAgo(3, 8, 0),
    foods: [{ name: 'Scrambled Eggs', category: 'Breakfast', ingredients: ing(['eggs', 'olive oil', 'salt']) }],
  });
  meals.push({
    timestamp: daysAgo(3, 13, 0),
    foods: [{ name: 'Chicken and Sweet Potato', category: 'Entree', ingredients: ing(['chicken breast', 'sweet potato', 'olive oil', 'salt']) }],
  });

  // Baseline poops days 6-3 (3/day, Bristol 4-5, minimal symptoms)
  for (const day of [6, 5, 4, 3]) {
    poops.push({ timestamp: daysAgo(day, 7, 0), severity: '4', symptoms: symptoms([]) });
    poops.push({ timestamp: daysAgo(day, 12, 0), severity: day % 2 === 0 ? '5' : '4', symptoms: symptoms([]) });
    poops.push({ timestamp: daysAgo(day, 18, 0), severity: '4', symptoms: symptoms([]) });
  }

  return {
    email: 'highfreq@test.com',
    meals,
    poops,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding test data...\n');

  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  const users = [
    dairyUser(),
    confoundedUser(),
    healthyUser(),
    severeUser(),
    minimalUser(),
    timingUser(),
    improvementUser(),
    highFrequencyUser(),
  ];

  for (const userData of users) {
    console.log(`Seeding: ${userData.email}`);
    await seedUser(passwordHash, userData);
  }

  console.log('\nDone! All test users seeded.');
  console.log('\nAccounts (all use password: testpass123):');
  for (const u of users) {
    console.log(`  ${u.email}`);
  }
}

main()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
