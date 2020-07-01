const stack = []
const unobservations = new Set ()

class Source {
	constructor (track) {
		this.track = track
		this.value = null
		this.ret = null
		this.upstreams = new Set ()
		this.downstreams = new Set ()
		this.disposed = true
		this.put = this.put.bind (this)
	}
	recalculate () {
		try {
			this.upstreams.forEach (up => unobservations.add (up))
			this.disposed = false
			stack.push (this)
			if (this.track.length) {
				const ret = this.track (this.put)
				this.ret = typeof ret === `function` ? ret : null
			} else {
				this.put (this.track ())
			}
		} finally {
			stack.pop ()
			if (stack.length === 0) {
				unobservations.forEach (s => s.dispose ())
				unobservations.clear ()
			}
		}
	}
	dispose () {
		this.upstreams.forEach (up => {
			up.downstreams.delete (this)
			this.upstreams.delete (up)
			if (up.downstreams.size === 0 && !up.disposed) up.dispose ()
		})
		this.ret && this.ret ()
		this.disposed = true
	}
	pull () {
		if (stack.length === 0) throw new Error (`don't pull outside a source`)
		if (stack.indexOf (this) > -1) throw new Error (`don't pull cyclically`)
		unobservations.delete (this)
		const down = stack [stack.length - 1]
		if (!this.downstreams.has (down)) {
			this.downstreams.add (down)
			down.upstreams.add (this)
			if (this.disposed) this.recalculate ()
		}
		return this.value
	}
	put (next) {
		if (this.disposed) throw new Error (`don't put after dispose`)
		if (this.value === next) return
		this.value = next
		if (stack.indexOf (this) > -1) return
		const propagation = this.queue ()
		//console.log (`about to propagate`, next, [ ...propagation ])
		propagation.forEach (s => s !== this && s.recalculate ())
	}
	queue (list = []) {
		if (list.indexOf (this) > -1) return
		[ ...this.downstreams ].forEach (s => s.queue (list))
		list.unshift (this)
		return list
	}
}

export const source = track => new Source (track)

export const sink = source => source.pull ()

export const recirculate = track => {
	let recirculator = null
	let disposed = false
	const up = source (put => (recirculator = put, () => recirculator = null))
	up.name = `UP`
	const result = track (up)
	result.name = `RESULT`
	const down = source (put => {
		if (disposed) return
		const value = sink (result)
		//console.log (`about to put`, value, !!recirculator, stack)
		recirculator && recirculator (value)
	})
	down.name = `DOWN`
	down.recalculate ()
	return () => down.dispose ()
}

/*
SOURCE LIFECYCLE:
* first sink -> (unqueue dispose -or- track -> maybe put) -> return
* other puts -> force sinking
* other sinks -> return
* last sink -> queue dispose
* end of stack -> unobserve
*/
