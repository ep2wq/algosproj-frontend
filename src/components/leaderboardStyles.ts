// The leaderboard table (the page, the landing tab and their loading skeletons). It never scrolls
// sideways: names wrap anywhere and rank and points keep their width. When the table is narrower
// than 24rem (a phone) the points go under the name in the same row; below 14rem (very large text
// on a phone) rank, name and points each get their own line. The table's parent has `@container`.
export const boardRow =
  '@max-[24rem]:grid @max-[24rem]:grid-cols-[4rem_minmax(0,1fr)] @max-[14rem]:grid-cols-[minmax(0,1fr)]'
export const boardRank = 'w-20 py-2 ps-4 pe-4 whitespace-nowrap tabular-nums @max-[24rem]:pe-0 @max-[14rem]:pb-0'
export const boardName = 'px-4 py-2 [overflow-wrap:anywhere] @max-[24rem]:pb-0 @max-[14rem]:pt-0'
// Wide enough for "1,234,567" plus the padding.
export const boardPoints =
  'w-[calc(9ch_+_2rem)] px-4 py-2 text-end whitespace-nowrap tabular-nums @max-[24rem]:col-span-full @max-[24rem]:w-auto @max-[24rem]:pt-0'
