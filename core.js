const Core = {}

const stack = []
const propagateQueue = []
const unobserveQueue = []

const prepend = (array, item) => contains (array, item) || array.unshift (item)
const append = (array, item) => contains (array, item) || array.push (item)
const contains = (array, item) => array.indexOf (item) !== -1
const remove = (array, item) => {
	const index = array.indexOf (item)
	if (index === -1) return
	array.splice (index, 1)
}

const link = (tail, head) => {
	if (contains (tail.successors, head) && contains (head.predecessors, tail)) return
	append (tail.successors, head)
	append (head.predecessors, tail)
	if (contains (unobserveQueue, tail)) remove (unobserveQueue, tail)
	else if (tail.successors.length === 1) observe (tail)
}
const unlink = (tail, head) => {
	if (!contains (tail.successors, head) && !contains (head.predecessors, tail)) return
	remove (tail.successors, head)
	remove (head.predecessors, tail)
	if (tail.successors.length === 0) append (unobserveQueue, tail)
}

const propagate = () => {
	propagateQueue.forEach (source => {
		unobserve (source)
		observe (source)
		source.propagating = false
	})
	propagateQueue.splice (0)
	unobserveQueue.forEach (unobserve)
	unobserveQueue.splice (0)
}

// recirculate (source => source) => dispose
Core.recirculate = fn => {
	var recirculator = source (() => sink (result))
	var result = fn (recirculator)
	link (result, recirculator)
	return () => unlink (result, recirculator)
}


const unobserve = source => {
	if (source.dispose) source.dispose ()
}
const observe = source => {
	if (source.observing === true) return
	source.observing = true
	source.predecessors.forEach (up => unlink (up, source))
	try {
		stack.push (source)
		if (source.track.length) {
			const ret = source.track (put (source))
			source.dispose = typeof ret === `function` ? ret : null
		} else {
			put (source) (source.track ())
		}
	} finally {
		stack.pop ()
		source.observing = false
	}
}
const queue = source => {
	if (source.propagating === true) return
	source.propagating = true
	source.successors.forEach (queue)
	prepend (propagateQueue, source)
}
const put = source => next => {
	if (source.successors.length === 0) throw `don't put after dispose`
	if (source.value === next) return
	source.value = next
	if (propagateQueue.length > 0) return
	source.successors.forEach (queue)
	//console.log (`propagate`, [ source.track, ...propagateQueue.map (s => s.track) ])
	propagate ()
}


// source (() => value) => source
// source (put => dispose) => source
Core.source = track => ({
	track, value: null, dispose: null,
	propagating: false, observing: false,
	predecessors: [], successors: [],
})

// sink (source) => value
Core.sink = source => {
	link (source, stack [stack.length - 1])
	return source.value
}

/*
SOURCE LIFECYCLE:
* first sink -> (unqueue dispose -or- track -> maybe put) -> return
* other puts -> force sinking
* other sinks -> return
* last sink -> queue dispose
* end of stack -> unobserve
*/
