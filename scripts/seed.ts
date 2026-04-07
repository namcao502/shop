// scripts/seed.ts
// Run with: npx tsx scripts/seed.ts
// Requires .env.local with Firebase Admin credentials

import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore(app);

const categories = [
  { name: "Keychains", slug: "keychains", order: 1 },
  { name: "Fridge Magnets", slug: "fridge-magnets", order: 2 },
  { name: "Clothing", slug: "clothing", order: 3 },
  { name: "Art & Paintings", slug: "art-paintings", order: 4 },
];

async function seed() {
  console.log("Seeding categories...");

  const categoryIds: Record<string, string> = {};

  for (const cat of categories) {
    const ref = db.collection("categories").doc();
    await ref.set(cat);
    categoryIds[cat.slug] = ref.id;
    console.log(`  Created category: ${cat.name} (${ref.id})`);
  }

  console.log("Seeding products...");

  const products = [
    {
      name: "Ao Dai Keychain",
      slug: "ao-dai-keychain",
      description: "Beautiful miniature ao dai keychain, handcrafted in Hoi An.",
      price: 45000,
      images: ["https://placehold.co/400x400/f59e0b/fff?text=Ao+Dai"],
      categoryId: categoryIds["keychains"],
      stock: 50,
      isPublished: true,
    },
    {
      name: "Conical Hat Fridge Magnet",
      slug: "conical-hat-fridge-magnet",
      description: "Traditional non la (conical hat) fridge magnet made from wood.",
      price: 35000,
      images: ["https://placehold.co/400x400/22c55e/fff?text=Non+La"],
      categoryId: categoryIds["fridge-magnets"],
      stock: 30,
      isPublished: true,
    },
    {
      name: "Vietnam Coffee T-Shirt",
      slug: "vietnam-coffee-tshirt",
      description: "Cotton t-shirt with Vietnamese coffee culture design.",
      price: 250000,
      images: ["https://placehold.co/400x400/3b82f6/fff?text=Coffee+Tee"],
      categoryId: categoryIds["clothing"],
      stock: 20,
      isPublished: true,
    },
    {
      name: "Lotus Watercolor Painting",
      slug: "lotus-watercolor-painting",
      description: "Hand-painted lotus watercolor on rice paper, framed.",
      price: 450000,
      images: ["https://placehold.co/400x400/ec4899/fff?text=Lotus"],
      categoryId: categoryIds["art-paintings"],
      stock: 10,
      isPublished: true,
    },
    {
      name: "Dragon Boat Keychain",
      slug: "dragon-boat-keychain",
      description: "Wooden dragon boat keychain from Ha Long Bay.",
      price: 55000,
      images: ["https://placehold.co/400x400/8b5cf6/fff?text=Dragon+Boat"],
      categoryId: categoryIds["keychains"],
      stock: 25,
      isPublished: true,
    },
  ];

  for (const product of products) {
    const ref = db.collection("products").doc();
    await ref.set(product);
    console.log(`  Created product: ${product.name} (${ref.id})`);
  }

  // Initialize order counter
  await db.collection("counters").doc("orders").set({ current: 0 });
  console.log("  Initialized order counter");

  console.log("Seed complete!");
}

seed().catch(console.error);
