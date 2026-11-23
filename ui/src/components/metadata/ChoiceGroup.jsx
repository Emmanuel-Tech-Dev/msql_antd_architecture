import { CheckOutlined } from '@ant-design/icons';

// A select field shown as chips or cards (config.display), for short option
// lists. Each option is a real radio or checkbox, so keyboard and screen
// readers treat it as a choice. Cards show an option's description.
export default function ChoiceGroup({ name, options, display = 'chips', multiple = false, value, onChange, disabled }) {
    const chosen = multiple ? (value ?? []) : value;
    const isChosen = (optionValue) => (multiple ? chosen.includes(optionValue) : chosen === optionValue);
    const toggle = (optionValue) => {
        if (!multiple) return onChange?.(optionValue);
        return onChange?.(isChosen(optionValue) ? chosen.filter((item) => item !== optionValue) : [...chosen, optionValue]);
    };
    const cards = display === 'cards';

    return (
        <div role={multiple ? 'group' : 'radiogroup'} className={cards ? 'grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5' : 'flex flex-wrap gap-2'}>
            {options.map((option) => {
                const selected = isChosen(option.value);
                return (
                    <label
                        key={option.value}
                        className={[
                            'relative flex cursor-pointer select-none border transition-colors',
                            cards ? 'flex-col gap-0.5 rounded-[calc(var(--app-radius,6px)*2)] px-3.5 py-3' : 'h-[38px] items-center gap-2 rounded-full px-3.5',
                            selected
                                ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] shadow-[0_0_0_0.5px_var(--color-accent)]'
                                : 'border-[var(--color-border-strong)] bg-[var(--color-bg-container)] hover:border-[var(--color-accent)]',
                            disabled ? 'cursor-not-allowed opacity-60' : '',
                        ].join(' ')}
                    >
                        <input
                            className="absolute h-px w-px opacity-0"
                            type={multiple ? 'checkbox' : 'radio'}
                            name={name}
                            value={option.value}
                            checked={selected}
                            disabled={disabled}
                            onChange={() => toggle(option.value)}
                        />
                        {!cards && selected && <CheckOutlined className="text-xs text-[var(--color-accent)]" aria-hidden="true" />}
                        <span className={cards ? 'text-sm font-semibold' : 'text-sm font-medium'}>{option.label}</span>
                        {cards && option.description && <span className="text-[12.5px] text-[var(--color-text-secondary)]">{option.description}</span>}
                    </label>
                );
            })}
        </div>
    );
}
