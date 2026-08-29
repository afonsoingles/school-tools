from errors.base import BaseError

class FeedNotFound(BaseError):
    status_code = 404
    code = "feed_not_found"
    message = "The requested calendar feed was not found, has not been generated yet, or does not belong to you."

class InvalidFeedRequest(BaseError):
    status_code = 400
    code = "invalid_feed_request"
    message = "The request for the calendar feed is invalid. Please check the parameters and try again."