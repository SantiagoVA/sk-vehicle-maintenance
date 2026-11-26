exports.up = function (knex) {
  return knex.schema.createTable("bookings", (table) => {
    table.increments("id").primary();
    table.string("ticket_no").notNullable().unique();

    table.string("service_id").notNullable();
    table.string("service_name").notNullable(); // snapshot at booking time
    table.integer("duration_minutes").notNullable();
    table.integer("price_from").nullable();

    table.date("date").notNullable(); // "YYYY-MM-DD"
    table.string("time").notNullable(); // "HH:MM", 24h

    table.string("customer_name").notNullable();
    table.string("customer_phone").notNullable();
    table.string("customer_email").notNullable();
    table.string("vehicle").notNullable();
    table.string("rego").notNullable();
    table.text("notes").nullable();

    // pending -> confirmed | declined | expired | cancelled
    table.string("status").notNullable().defaultTo("pending");

    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.index(["date", "status"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("bookings");
};
