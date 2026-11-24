import useIcons from '../../hooks/useIcons';

export default function IconCell({ name }) {
    const { resolveIcon } = useIcons();
    return <span className="inline-flex items-center gap-2">{resolveIcon(name)}<span>{name}</span></span>;
}
