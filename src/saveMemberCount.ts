const fs = require('fs')

export const saveMemberCount = async (
  file: string,
  date: string,
  count: number,
): Promise<void> =>
  await fs.promises.appendFile(file, [date, count].join(',') + '\n')
