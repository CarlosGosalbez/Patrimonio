# 🔍 Skill: Code Reviewer

Review de código profesional con best practices y security checks.

## Especialización

Reviews completos de:

- **TypeScript** (strict mode, types, patterns)
- **React** (hooks rules, performance, accessibility)
- **Security** (XSS, SQL injection, secrets)
- **Performance** (bundle size, re-renders, memory leaks)
- **Accessibility** (WCAG AAA, ARIA, keyboard nav)
- **Tests** (coverage, casos edge)

## Checklist de Review

### TypeScript

- [ ] Strict mode habilitado
- [ ] No uso de `any`
- [ ] Interfaces/types bien definidos
- [ ] Enums para constantes
- [ ] Generics cuando aplica
- [ ] Path aliases (@/) usados

### React

- [ ] Hooks rules seguidas
- [ ] useCallback/useMemo apropiados
- [ ] Keys únicas en listas
- [ ] No side effects en render
- [ ] Error boundaries implementados
- [ ] Suspense para lazy loading

### Security

- [ ] No secrets hardcodeados
- [ ] Input sanitization
- [ ] XSS prevention
- [ ] CSRF tokens en forms
- [ ] RLS policies en DB queries
- [ ] Environment variables para configs

### Performance

- [ ] Bundle size <500KB gzipped
- [ ] Code splitting por rutas
- [ ] Images optimizadas (next/image)
- [ ] React.memo en componentes pesados
- [ ] Evitar re-renders innecesarios
- [ ] Lazy loading de componentes

### Accessibility

- [ ] ARIA labels presentes
- [ ] Keyboard navigation funcional
- [ ] Color contrast 7:1 (WCAG AAA)
- [ ] Touch targets 44x44px mínimo
- [ ] Screen reader friendly
- [ ] Focus visible en elementos interactivos

### Testing

- [ ] Unit tests >80% coverage
- [ ] Integration tests en flujos críticos
- [ ] E2E tests en user journeys
- [ ] Edge cases cubiertos
- [ ] Error scenarios testeados

## Ejemplo de Review

```typescript
// ❌ BAD
export const MyComponent = ({ data }: any) => {
  const [state, setState] = useState();

  const filtered = data.filter(item => item.active);

  return (
    <div onClick={() => setState(filtered)}>
      {filtered.map(item => <div>{item.name}</div>)}
    </div>
  );
};

// ✅ GOOD
interface MyComponentProps {
  data: Item[];
}

export const MyComponent: FC<MyComponentProps> = memo(({ data }) => {
  const [state, setState] = useState<Item[]>([]);

  const filtered = useMemo(
    () => data.filter(item => item.active),
    [data]
  );

  const handleClick = useCallback(() => {
    setState(filtered);
  }, [filtered]);

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label="Filter active items"
    >
      {filtered.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
});
```

---

**Versión:** 1.0  
**Actualizado:** 2026-05-02
