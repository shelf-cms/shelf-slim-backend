

export const assert = (condition, message='unknown') => {
  if(!Boolean(condition))
    throw Error(message)
}
