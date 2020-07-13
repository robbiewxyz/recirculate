const stack = []
let clock = 0
const unobservations = new Set ()

class Source {
	constructor (track) {
		this.track = track
		this.value = null
		this.ret = null
		this.upstreams = new Set ()
		this.downstreams = new Set ()
		this.disposed = true
		this.updated = clock
		this.put = this.put.bind (this)
	}
	recalculate () {
		if (!this.disposed) this.ret && this.ret ()
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
		this.disposed = true
		this.ret && this.ret ()
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
		this.updated = ++clock
		propagation.forEach (s => {
			if (s === this) return
			if (![ ...s.upstreams ].find (up => up.updated === clock)) return
			const prev = s.value
			s.recalculate ()
			if (s.value !== prev) s.updated = clock
		})
	}
	queue (list = []) {
		if (list.indexOf (this) > -1) return
		[ ...this.downstreams ].forEach (s => s.queue (list))
		list.unshift (this)
		return list
	}
}

export const source = track => new Source (track)

export const isSource = source => source instanceof Source

export const sink = source => isSource (source) ? source.pull () : source

export const recirculate = track => {
	let recirculator = null
	let disposed = false
	const up = source (put => (recirculator = put, () => recirculator = null))
	const result = track (up)
	if (!(result instanceof Source)) throw new Error (`only return a source in recirculate not ${source}`)
	const down = source (put => {
		const value = sink (result)
		//console.log (`about to recirculate`, value, stack)
		recirculator && recirculator (value)
	})
	down.recalculate ()
	return () => down.dispose ()
}
