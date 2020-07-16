export class Pending extends Error {}
const PENDING: unique symbol = Symbol (`PENDING`)

export type Put<T> = (value: T) => void
type AsyncTrack<T> = (put: Put<T>) => Disposer | void
type SyncTrack<T> = () => T
export type Track<T> = AsyncTrack<T> | SyncTrack<T>
export type Disposer = () => void
export type Loop<T> = (i: Source<T>) => Source<T>

function isAsyncTrack<T> (track: Track<T>): track is AsyncTrack<T> {
	return track.length > 0
}

export function isSource<T> (source: any): source is Source<T> {
	return source instanceof Source
}

let clock: number = 0
const stack: Array<Source<any>> = []
const unobservations: Set<Source<any>> = new Set ()

export class Source<T> {
	protected value: T | typeof PENDING = PENDING
	protected updated: number = clock
	protected disposer: Disposer | void = undefined
	protected readonly upstreams: Set<Source<any>> = new Set ()
	protected readonly downstreams: Set<Source<any>> = new Set ()
	protected disposed: boolean = true
	protected constructor (
		protected readonly track: Track<T>
	) {}
	protected recalculate () {
		if (!this.disposed) this.disposer && this.disposer ()
		this.disposed = false
		try {
			this.upstreams.forEach (up => Source.unlink (up, this))
			stack.push (this)
			if (isAsyncTrack (this.track)) {
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
	protected pull () {
		if (stack.length === 0) throw new Error (`don't pull outside a source`)
		if (stack.indexOf (this) > -1) throw new Error (`don't pull cyclically`)
		unobservations.delete (this)
		if (this.disposed) this.recalculate ()
		Source.link (this, stack [stack.length - 1])
		if (this.value === PENDING) throw new Pending ()
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
	protected maybeRecalculate () {
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
	static source<T> (track: Track<T>) {
		return new Source (track)
	}
	static sink<T> (source: Source<T> | T, pending?: T) {
		try {
			return source instanceof Source ? source.pull () : source
		} catch (e) {
			if (!(e instanceof Pending)) throw e
			if (pending === undefined) throw e
			return pending
		}
	}
}

export const source = Source.source
export const sink = Source.sink

class Recirculator<T> extends Source<T> {
	protected i: Source<T>
	protected disposed: boolean = false
	protected constructor (loop: Loop<T>) {
		super (() => {})
		this.i = loop (this)
		this.recalculate ()
	}
	protected dispose () {
	}
	protected stop = () => {
		super.dispose ()
		Source.disposeUnobservations ()
	}
	protected recalculate () {
		try {
			stack.splice (0, stack.length, this)
			const value = Source.sink (this.i)
			stack.splice (0)
			this.put (value)
		} catch (e) {
			if (!(e instanceof Pending)) throw e
		} finally {
			stack.splice (0)
		}
	}
	protected pull () {
		if (stack.length === 0) throw new Error (`don't pull outside a source`)
		unobservations.delete (this)
		Source.link (this, stack [stack.length - 1])
		if (this.value === PENDING) throw new Pending ()
		return this.value
	}
	protected queue (list: Array<Source<any>>) {
		if (list.indexOf (this) > -1) return
		list.unshift (this)
	}
	static recirculate<T> (loop: Loop<T>): Disposer {
		const recirculator = new Recirculator (loop)
		return recirculator.stop
	}
}

export const recirculate = Recirculator.recirculate
