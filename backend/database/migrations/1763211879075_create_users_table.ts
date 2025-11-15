import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('nickname').notNullable().unique()
      table.string('first_name').notNullable()
      table.string('last_name').notNullable()

      table.string('email').notNullable().unique()
      table.string('password').notNullable()

      table.boolean('notify_only_mentions').notNullable().defaultTo(false)

      table
        .enum('status', ['online', 'offline', 'dnd'], {
          useNative: false,
          enumName: 'user_status_enum',
        })
        .notNullable()
        .defaultTo('online')

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
