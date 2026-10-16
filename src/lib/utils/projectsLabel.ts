export const formatProjectsList = (projects: readonly string[]) =>
  projects.join(" vs ");

export const formatSelectionHeading = (projects: readonly string[]) =>
  `${formatProjectsList(projects)} npm downloads`;
