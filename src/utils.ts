import { Track, State, Source, source, sink } from '.'

// yes = stream
export const yes = source (() => true)
// no = stream
export const no = source (() => false)

// expr (track) => value
export const expr = <T> (track: Track<T>) => sink (source (track))

// pipe (stream) => stream
export const pipe = (s: any) => source (() => sink (s))
// reduce ((acc, value) => acc) (acc) (stream) => stream
export const reduce = <I, A> (i: (a: A, i: I) => A) => (a: A) => (s: Source<I>) => source (() => a = i (a, sink (s)))
// map (value => value) (stream) => stream
export const map = <I, O> (i: (i: I) => O) => (s: Source<I>) => source (() => i (sink (s)))
// filter (value => boolean) (stream) => stream
export const filter = <I> (i: (i: I) => boolean) => (s: Source<I>) => source (() => reduce ((a: I | State, v: I) => i (v) ? v : a) (State.PENDING) (s))
// and (...streams) => stream
export const and = <T> (...ss: Array<T | Source<T>>) => source (() => ss.reduce ((a: T | true, s: T | Source<T>) => a && sink (s), true as T | true))
// or (...streams) => stream
export const or = <T> (...ss: Array<T | Source<T>>) => source (() => ss.reduce ((a: T | false, s: T | Source<T>) => a || sink (s), false as T | false))
// comma (...streams) => stream
export const comma = <T> (...ss: Array<T | Source<T>>) => source (() => ss.reduce ((a: T | null, s: T | Source<T>) => sink (s), null))
// combine (...sources) => source
export const combine = <T> (...ss: Array<T | Source<T>>) => source (put => ss.forEach ((s: T | Source<T>) => sink (source (() => put (sink (s))))))

// interval (delay) => stream
export const interval = (d: number | Source<number>) => source (put => {
	const i = setInterval (put, sink (d))
	return () => clearInterval (i)
})
// raf => stream
export const raf = source (put => {
	let i = 0
	const r = () => i = (put (i++), requestAnimationFrame (r))
	let f = requestAnimationFrame (r)
	return () => cancelAnimationFrame (f)
})
