import { source, sink } from '.'

class Element {
}

export const Fragment = () => context => source (put => {
})

export const h = (type, props = null, ...children) => source (dispatch => {
	if (typeof sink (type) === `string`) {
		const node = document.createElement (sink (type))

		// this is a sink-source style diffing algorithm
		// existing keys' sources are observed
		// new keys have new sources created and observed
		// old keys' sources are not observed & are disposed automatically
		const attrs = {}
		const events = {}
		sink (source (() => {
			for (const key in sink (props)) {
				// this optimization is borrowed from preactjs/preact
				if (key [0] === `o` && key [1] === `n`) {
					// bind event listeners & return disposer to remove
					if (events [key]) sink (events [key])
					else sink (events [key] = source (put => {
						const callback = sink (sink (props) [key])
						const listener = ev => dispatch (callback (ev))
						node.addEventListener (event, listener)
						return () => node.removeEventListener (event, listener)
					}))
				} else {
					// set attributes & return disposers to remove
					if (attrs [key]) sink (attrs [key])
					else sink (attrs [key] = source (put => {
						node.setAttribute (key, sink (sink (props) [key]))
						return () => node.removeAttribute (key)
					}))
				}
			}
		}))

		// nodes is a list of mounters
		const nodes = []
		sink (source (put => {
			for (let index = 0; index < sink (children).length; index++) {
				if (nodes [index]) sink (nodes [index])
				else sink (nodes [index] = source (put => {
					if (typeof sink (sink (children) [index]) === `string`) {
						const text = document.createTextNode (sink (child))
						node.insertBefore (text, nodes [index])
						return () => node.removeChild (text)
					} else {
						context.parent.insertBefore (node, context.before)
						return () => node.parentNode.removeChild (node)
					}
				}))
			}
		}))

		dispatch ({ op: `MOUNT`, node })
	} else if (sink (type) === Fragment) {
		// TODO
	} else {
		// TODO
	}
	//return { node, events }
})


	/*const element = source (pub => {
		if (typeof type === `string`) {
			const node = document.createElement (sink (type))
			element.node = node
			const propSources = {}
			sink (source (put => {
				for (const key in sink (props)) {
					if (!propSources [key]) propSources [key] = source (put => {
						node.setAttribute (key, sink (sink (props) [key]))
						return () => node.removeAttribute (key)
					})
					sink (propSources [key])
				}
			}))

			sink (source (put => {
				for (const index in children) {
					const attachment = source (put => {
					})
				}
				children.forEach (
			}))

			element.childrenByDownstream
			let down = element
			do {
				if (down.downstreams.size > 1) throw new Error (`only observe an element once`)
				down = [ ...down.downstreams ] [0]
			} while (down && !down.node)
			if (!down.node) throw new Error (`only observe elements inside another element`)
			const index = down.children.indexOf (down)
			if (index === down.upstreams.size) down.node.appendChild (element.node)
			else down.node.insert.children [index]
			return () => {
				down.node.removeChild (element.node)
			}
		} else {
			return type ({ ...props, children })
		}
	})
	return element*/

export const render = (element, node) => source (put => {
	const events = sink (element) ({ parent: node, before: null })
	sink (source (() => put (sink (events))))
})
