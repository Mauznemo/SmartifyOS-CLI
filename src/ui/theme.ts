import color from 'picocolors';

/**
 * Every color the CLI is allowed to use, in one place.
 *
 * Always go through this instead of reaching for picocolors directly, so the whole tool
 * keeps one look and a later theme change is a single edit. picocolors already turns
 * itself off when the output is piped somewhere or `NO_COLOR` is set.
 */
export const theme = {
	/** The SmartifyOS accent, used for the product name and anything highlighted. */
	brand: color.cyan,
	/** Something worked. */
	success: color.green,
	/** Something needs attention but is not fatal. */
	warn: color.yellow,
	/** Something failed. */
	error: color.red,
	/** Secondary text, hints, and anything the eye should skip over. */
	dim: color.dim,
	/** File paths, commands to type, and other things quoted from the terminal. */
	code: color.cyan,
	/** Emphasis inside a sentence. */
	strong: color.bold,
} as const;

/** Symbols used in help output and messages. Plain ASCII where it does not cost anything. */
export const symbols = {
	bullet: '•',
	arrow: '›',
} as const;

/** The product name, styled. Spelled out in full, never shortened to "Smartify". */
export function brandName(): string {
	return theme.brand(theme.strong('SmartifyOS'));
}
