/**
 * Notification.ts — Phase 5 notification system types.
 *
 * `NotificationCategory` is a first-class engine type, emitted at the site
 * where log events are created. This keeps the engine DOM-free while giving
 * the web layer enough structured information to drive visual treatment,
 * auto-dismiss timing, sound selection, and panel navigation declaratively.
 *
 * `NotificationPanelTargetHint` is a string literal union (not `PanelId`)
 * so the engine does not depend on web-side types. The web layer narrows this
 * to its `PanelId` union in `notificationCategoryRegistry.ts`.
 */

/**
 * Content-domain category for a game log event.
 *
 * | Category     | Trigger example                              | requiresAction |
 * |--------------|----------------------------------------------|----------------|
 * | production   | Rome produced Warrior / built Granary        | no             |
 * | research     | Researched Bronze Working / mastered tech    | no             |
 * | civic        | Adopted Code of Laws / mastered civic        | no             |
 * | diplomatic   | Egypt declared war / Treaty signed           | hostile=yes    |
 * | crisis       | Plague begins / Barbarian horde approaches   | yes            |
 * | age          | You may advance to the Exploration Age       | yes            |
 * | info         | Save complete / UI-originated acknowledgements | no            |
 */
export type NotificationCategory =
  | 'production'
  | 'research'
  | 'civic'
  | 'diplomatic'
  | 'crisis'
  | 'age'
  | 'info';

/**
 * Hint about which panel the web layer should open when a notification is
 * clicked. Uses a string literal union (not web-side `PanelId`) to keep the
 * engine DOM-free. The web layer narrows this to `PanelId` in its registry.
 */
export type NotificationPanelTargetHint =
  | 'city'
  | 'tech'
  | 'civics'
  | 'diplomacy'
  | 'crisis'
  | 'age'
  | 'log';
