import { createContext, useContext } from "react";

export type CareerWorkspaceContextValue = {
  canWrite: boolean;
  readOnly: boolean;
  regionCode: string;
};

const defaultValue: CareerWorkspaceContextValue = {
  canWrite: true,
  readOnly: false,
  regionCode: "US",
};

export const CareerWorkspaceContext = createContext<CareerWorkspaceContextValue>(defaultValue);

export function useCareerWorkspace(): CareerWorkspaceContextValue {
  return useContext(CareerWorkspaceContext);
}
