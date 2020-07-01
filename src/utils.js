import { source, sink } from './core'

// yes = stream
export const yes = source (() => true)
// no = stream
export const no = source (() => false)

// pipe (stream) => stream
export const pipe = s => source (() => sink (s))
// reduce ((acc, value) => acc) (acc) (stream) => stream
export const reduce = i => a => s => source (() => a = i (a, sink (s)))
// map (value => value) (stream) => stream
export const map = i => s => source (() => i (sink (s)))
// filter (value => boolean) (stream) => stream
export const filter = i => s => source (() => reduce ((a, v) => i (v) ? v : a) (null) (s))
// and (...streams) => stream
export const and = (...ss) => source (() => ss.reduce ((a, s) => a && sink (s), true))
// or (...streams) => stream
export const or = (...ss) => source (() => ss.reduce ((a, s) => a || sink (s), false))
// comma (...streams) => stream
export const comma = (...ss) => source (() => ss.reduce ((a, s) => sink (s), null))

// interval (delay) => stream
export const interval = d => source (put => {
	const i = setInterval (put, sink (d))
	return () => clearInterval (i)
})
// raf => stream
export const raf = source (put => {
	const r = () => i = (put (), requestAnimationFrame (r))
	let i = requestAnimationFrame (r)
	return () => clearAnimationFrame (i)
})
