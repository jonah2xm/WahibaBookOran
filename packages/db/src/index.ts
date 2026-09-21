/**
 * @bookoran/db — mongoose models, connection and the helpers that keep the
 * derived data honest.
 *
 * Both apps import from here. Nothing in this package imports from an app.
 */

export { connectDb, disconnectDb } from "./connect";

export {
  bilingualSchema,
  optionalBilingualSchema,
  intField,
  PHONE_PATTERN,
  type Bilingual,
} from "./schema-helpers";

export { Category, type CategoryDoc } from "./models/Category";
export { Book, type BookDoc } from "./models/Book";
export {
  StockMovement,
  MOVEMENT_TYPES,
  type MovementType,
  type StockMovementDoc,
} from "./models/StockMovement";
export {
  Order,
  ORDER_STATUSES,
  type OrderStatus,
  type OrderDoc,
} from "./models/Order";
export {
  AgreementSection,
  type AgreementSectionDoc,
} from "./models/AgreementSection";
export {
  AdminUser,
  ADMIN_ROLES,
  hashPassword,
  verifyAdminPassword,
  type AdminRole,
  type AdminUserDoc,
} from "./models/AdminUser";
export {
  Settings,
  defaultSettings,
  getSettings,
  type SettingsDoc,
} from "./models/Settings";
export {
  YalidineCache,
  CACHE_KINDS,
  type CacheKind,
  type YalidineCacheDoc,
} from "./models/YalidineCache";
export { Counter, nextSequence } from "./models/Counter";

export { nextOrderNumber } from "./orderNumber";
export {
  applyOrderStatus,
  canTransition,
  TransitionError,
} from "./orders";
export {
  recordMovement,
  recomputeStockOnHand,
  reconcileAllStock,
} from "./stock";
