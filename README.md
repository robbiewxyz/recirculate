## SOURCE LIFECYCLE

* first sink -> (un-queue dispose or track -> maybe put) -> return value
* other puts -> force sinking
* other sinks -> return value
* last sink -> queue dispose
* end of stack -> unobserve
