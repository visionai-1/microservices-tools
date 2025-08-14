"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = void 0;
// Event types for different services
var EventType;
(function (EventType) {
    // Payment Service Events
    EventType["PAYMENT_CREATED"] = "payment.created";
    EventType["PAYMENT_COMPLETED"] = "payment.completed";
    EventType["PAYMENT_FAILED"] = "payment.failed";
    // Media Service Events
    EventType["MEDIA_UPLOADED"] = "media.uploaded";
    EventType["MEDIA_PROCESSED"] = "media.processed";
    EventType["MEDIA_DELETED"] = "media.deleted";
    // User Management Events
    EventType["USER_CREATED"] = "user.created";
    EventType["USER_UPDATED"] = "user.updated";
    EventType["USER_DELETED"] = "user.deleted";
    EventType["USER_ROLE_CHANGED"] = "user.role.changed";
})(EventType || (exports.EventType = EventType = {}));
