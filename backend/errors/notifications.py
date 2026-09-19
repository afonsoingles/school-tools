from errors.base import BaseError


class NotificationNotFound(BaseError):
    status_code = 404
    code = "notification_not_found"
    message = "Notification not found."


class PushNotConfigured(BaseError):
    status_code = 503
    code = "push_not_configured"
    message = "Push notifications are not configured."


class InvalidPushSubscription(BaseError):
    status_code = 400
    code = "invalid_push_subscription"
    message = "Invalid push subscription."