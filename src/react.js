const useSink = s => {
	let [ value, update ] = useState (null)
	const dispose = useMemo (() => sink (() => update (value = s ())), [ s ])
	useEffect (() => () => dispose (), [ dispose ])
	return value
}

