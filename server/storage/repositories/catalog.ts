import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import { merchants, menuItems } from "@shared/schema";
import type { Restaurant, MenuItem, InsertRestaurant, InsertMenuItem } from "@shared/schema";
import { randomUUID } from "crypto";
import { LogisticsRepository } from "./logistics";

export class CatalogRepository extends LogisticsRepository {
  async getRestaurants(cuisine?: string, searchQuery?: string): Promise<Restaurant[]> {
    try {
      const dbMerchants = await db
        .select()
        .from(merchants)
        .where(and(eq(merchants.status, 'active'), eq(merchants.closeStore, 0)))
        .orderBy(merchants.restaurantName);

      let results: Restaurant[] = dbMerchants.map(m => ({
        id: m.id,
        name: m.restaurantName,
        description: m.description || m.shortDescription || 'AAVIN District Cooperative Milk Producers Union - Quality dairy products',
        cuisine: 'Dairy Products',
        image: (() => {
          const validImg = (s?: string | null) => s && (s.startsWith('/') || s.startsWith('http'));
          return validImg(m.headerImage) ? m.headerImage! : validImg(m.logo) ? m.logo! : '/unions/dairy-factory-1_2.jpg';
        })(),
        rating: '4.5',
        deliveryTime: '30-45 min',
        deliveryFee: '0.00',
        address: m.address || '',
        isOpen: true,
        createdAt: m.createdAt || null,
      }));

      if (cuisine) {
        results = results.filter(r =>
          r.cuisine.toLowerCase() === cuisine.toLowerCase()
        );
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        results = results.filter(r =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q)
        );
      }

      return results;
    } catch (error) {
      console.error('Error fetching restaurants from DB, falling back to in-memory:', error);
      let results = Array.from(this.restaurants.values());
      if (cuisine) {
        results = results.filter(r => r.cuisine.toLowerCase() === cuisine.toLowerCase());
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        results = results.filter(r =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q)
        );
      }
      return results;
    }
  }

  async getRestaurant(id: string): Promise<Restaurant | undefined> {
    return this.restaurants.get(id);
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const id = randomUUID();
    const newRestaurant: Restaurant = {
      ...restaurant,
      id,
      isOpen: restaurant.isOpen ?? true,
      createdAt: new Date(),
    };
    this.restaurants.set(id, newRestaurant);
    return newRestaurant;
  }

  async updateRestaurant(id: string, restaurant: Partial<InsertRestaurant>): Promise<Restaurant | undefined> {
    const existing = this.restaurants.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...restaurant };
    this.restaurants.set(id, updated);
    return updated;
  }

  async getAllMenuItems(): Promise<MenuItem[]> {
    try {
      const results = await db.select().from(menuItems).orderBy(menuItems.category, menuItems.name);
      return results;
    } catch (error) {
      console.error('Error fetching all menu items from database:', error);
      return Array.from(this.menuItems.values());
    }
  }

  async getMenuItems(restaurantId: string, category?: string): Promise<MenuItem[]> {
    try {
      let results;
      if (category) {
        results = await db.select().from(menuItems)
          .where(eq(menuItems.restaurantId, restaurantId));
        results = results.filter(item => 
          item.category.toLowerCase() === category.toLowerCase()
        );
      } else {
        results = await db.select().from(menuItems)
          .where(eq(menuItems.restaurantId, restaurantId));
      }
      return results;
    } catch (error) {
      console.error('Error fetching menu items from database:', error);
      // Fallback to in-memory
      let results = Array.from(this.menuItems.values()).filter(
        item => item.restaurantId === restaurantId
      );
      if (category) {
        results = results.filter(item => 
          item.category.toLowerCase() === category.toLowerCase()
        );
      }
      return results;
    }
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    try {
      const results = await db.select().from(menuItems).where(eq(menuItems.id, id));
      return results[0];
    } catch (error) {
      console.error('Error fetching menu item from database:', error);
      return this.menuItems.get(id);
    }
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    try {
      const [newMenuItem] = await db.insert(menuItems).values({
        ...menuItem,
        isAvailable: menuItem.isAvailable ?? true,
      }).returning();
      return newMenuItem;
    } catch (error) {
      console.error('Error creating menu item in database:', error);
      // Fallback to in-memory
      const id = randomUUID();
      const newMenuItem: MenuItem = {
        ...menuItem,
        id,
        isAvailable: menuItem.isAvailable ?? true,
        createdAt: new Date(),
      };
      this.menuItems.set(id, newMenuItem);
      return newMenuItem;
    }
  }

  async updateMenuItem(id: string, menuItem: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    try {
      const [updated] = await db.update(menuItems)
        .set(menuItem)
        .where(eq(menuItems.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating menu item in database:', error);
      // Fallback to in-memory
      const existing = this.menuItems.get(id);
      if (!existing) return undefined;
      const updated = { ...existing, ...menuItem };
      this.menuItems.set(id, updated);
      return updated;
    }
  }

}