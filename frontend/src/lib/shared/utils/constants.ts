/**
 * Shared constants used across the application
 */

/**
 * RFC 4122 Nil UUID - Used to indicate "beginning of list" positioning
 * This special UUID value is used when a task is positioned at the top of the list.
 * It maintains UUID type safety while providing a semantic indicator for top-of-list positioning.
 * 
 * @see https://tools.ietf.org/html/rfc4122#section-4.1.7
 */
export const NIL_UUID = '00000000-0000-0000-0000-000000000000';