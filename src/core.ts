export enum State { PENDING = `PENDING` }

export type Put<T> = (value: T) => void
type Track1<T> = (put: Put<T>) => Disposer | void
type Track2<T> = () => T
export type Track<T> = Track1<T> | Track2<T>
export type Disposer = () => void
export type Loop<T> = (i: Source<T>) => Source<T>

function isTrack1<T> (track: Track<T>): track is Track1<T> {
	return track.length > 0
}

let clock: number = 0
const stack: Array<Source<any>> = []
const unobservations: Set<Source<any>> = new Set ()

export class Source<T> {
	protected value: T | State = State.PENDING
	protected updated: number = clock
	protected disposer: Disposer | void = undefined
	protected readonly upstreams: Set<Source<any>> = new Set ()
	protected readonly downstreams: Set<Source<any>> = new Set ()
	protected disposed: boolean = true
	constructor (readonly track: Track<T>) {
	}
	protected recalculate () {
		if (!this.disposed) this.disposer && this.disposer ()
		this.disposed = false
		try {
			this.upstreams.forEach (up => Source.unlink (up, this))
			stack.push (this)
			if (isTrack1 (this.track)) {
				const disposer = this.track (this.put)
				this.disposer = disposer || undefined
			} else {
				this.put (this.track ())
			}
		} finally {
			stack.pop ()
			if (stack.length === 0) Source.disposeUnobservations ()
		}
	}
	protected dispose () {
		if (this.disposed) throw new Error (`don't dispose twice`)
		this.upstreams.forEach (up => Source.unlink (up, this))
		this.disposed = true
		this.disposer && this.disposer ()
	}
	pull () {
		if (stack.length === 0) throw new Error (`don't pull outside a source`)
		if (stack.indexOf (this) > -1) throw new Error (`don't pull cyclically`)
		unobservations.delete (this)
		if (this.disposed) this.recalculate ()
		Source.link (this, stack [stack.length - 1])
		if (this.value === State.PENDING) throw State.PENDING
		return this.value
	}
	protected put = (next: T) => {
		if (this.disposed) throw new Error (`don't put after dispose`)
		if (this.value === next) return
		this.value = next
		this.updated = ++clock
		if (stack.length === 0) {
			const queue: Array<Source<any>> = []
			this.downstreams.forEach (s => s.queue (queue))
			queue.forEach (s => s.maybeRecalculate ())
		}
	}
	maybeRecalculate () {
		let stale = false
		this.upstreams.forEach (up => stale = stale || up.updated === clock)
		if (stale) this.recalculate ()
	}
	protected queue (queue: Array<Source<any>>) {
		if (queue.indexOf (this) > -1) return
		this.downstreams.forEach (s => s.queue (queue))
		queue.unshift (this)
	}
	protected static link (up: Source<any>, down: Source<any>) {
		up.downstreams.add (down)
		down.upstreams.add (up)
	}
	protected static unlink (up: Source<any>, down: Source<any>) {
		up.downstreams.delete (down)
		down.upstreams.delete (up)
		if (up.downstreams.size === 0) unobservations.add (up)
	}
	protected static disposeUnobservations () {
		unobservations.forEach (s => s.dispose ())
		unobservations.clear ()
	}
}

export function source<T> (track: Track<T>): Source<T> {
	return new Source (track)
}

export function isSource<T> (source: any): source is Source<T> {
	return source instanceof Source
}

export function sink<T> (source: Source<T> | T): T {
	return source instanceof Source ? source.pull () : source
}

class Recirculator<T> extends Source<T> {
	protected o: Source<T>
	protected disposed: boolean = false
	constructor (loop: Loop<T>) {
		super (() => {})
		this.o = loop (this)
		this.recalculate ()
	}
	dispose = () => {
		super.dispose ()
		Source.disposeUnobservations ()
	}
	recalculate () {
		try {
			stack.push (this)
			this.put (this.o.pull ())
			stack.pop ()
		} catch (e) {
			if (e !== State.PENDING) throw e
			stack.pop ()
		}
	}
	pull () {
		if (stack.length === 0) throw new Error (`don't pull outside a source`)
		unobservations.delete (this)
		Source.link (this, stack [stack.length - 1])
		if (this.value === State.PENDING) throw State.PENDING
		return this.value
	}
	protected queue (list: Array<Source<any>>) {
		if (list.indexOf (this) > -1) return
		list.unshift (this)
	}
}

export function recirculate<T> (loop: Loop<T>): Disposer {
	const recirculator = new Recirculator (loop)
	return recirculator.dispose
}
