import { describe, expect, test } from "vitest";
import z from "zod";

import * as Fiecs from "../index";

describe("locked tables", () => {
  test("We can set tables to be locked", () => {
    const world = new Fiecs.World();

    world.lockTables();
    expect(world.areTablesLocked()).toBe(true);
  });

  test("We can unlock tables", () => {
    const world = new Fiecs.World();

    world.lockTables();
    world.unlockTables();
    expect(world.areTablesLocked()).toBe(false);
  });

  test("If tables are locked, add throws", () => {
    const world = new Fiecs.World();

    world.lockTables();

    const tag = world.tag();

    const entity = world.entity();
    expect(() => entity.add(tag)).toThrow("Tables locked");
  });

  test("If tables are locked, remove throws", () => {
    const world = new Fiecs.World();

    const tag = world.tag();
    const entity = world.entity().add(tag);

    world.lockTables();

    expect(() => entity.remove(tag)).toThrow("Tables locked");
  });

  test("If tables are locked, set throws if it adds", () => {
    const world = new Fiecs.World();

    world.lockTables();

    const comp = world.component(z.number());

    const entity = world.entity();
    expect(() => entity.set(comp, 1)).toThrow("Tables locked");
  });

  test("If tables are locked, clear throws", () => {
    const world = new Fiecs.World();

    const tag = world.tag();
    const entity = world.entity().add(tag);

    world.lockTables();

    expect(() => entity.clear()).toThrow("Tables locked");
  });
  test("If tables are locked, destruct throws", () => {
    const world = new Fiecs.World();

    const tag = world.tag();
    const entity = world.entity().add(tag);

    world.lockTables();

    expect(() => entity.destruct()).toThrow("Tables locked");
  });
  test("If tables are locked, removeFromAll throws", () => {
    const world = new Fiecs.World();

    const tag = world.tag();
    world.entity().add(tag);

    world.lockTables();

    expect(() => world.removeFromAll(tag)).toThrow("Tables locked");
  });

  test("If tables are locked, destructAllWith throws", () => {
    const world = new Fiecs.World();

    const tag = world.tag();
    world.entity().add(tag);

    world.lockTables();

    expect(() => world.destructAllWith(tag)).toThrow("Tables locked");
  });
});
