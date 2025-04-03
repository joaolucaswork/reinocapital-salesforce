export const NavigationMixin = (Base) => {
  return class extends Base {
    navigate(pageReference) {
      return Promise.resolve(true);
    }
  };
};

NavigationMixin.Navigate = Symbol("Navigate");
