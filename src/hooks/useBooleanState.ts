import { useCallback, useState } from 'react';

type UseBooleanStateReturnType = [boolean, VoidFunction, VoidFunction, VoidFunction];

/**
 *
 * @param initialState boolean
 * @returns tuple [ state, setTrueFn, setFalseFn, toggleFn ]
 */
export default function useBooleanState(initialState: boolean | (() => boolean)): UseBooleanStateReturnType {
  const [isTrue, setIsTrue] = useState<boolean>(initialState);

  return [
    isTrue,
    useCallback(() => setIsTrue(true), []),
    useCallback(() => setIsTrue(false), []),
    useCallback(() => setIsTrue((prev) => !prev), []),
  ];
}
