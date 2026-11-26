exports.up = function (knex) {
  return knex.schema.alterTable("bookings", (table) => {
    table.string("decided_by").nullable();
    table.timestamp("reminder_sent_at").nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("bookings", (table) => {
    table.dropColumn("decided_by");
    table.dropColumn("reminder_sent_at");
  });
};
