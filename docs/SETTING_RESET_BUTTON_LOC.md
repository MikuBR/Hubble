# SETTING_RESET_BUTTON_LOC — Onde inserir o botão de reset de dados de demonstração

> **Status: PROPOSTA — NÃO APLICAR.**
> Este documento identifica o ponto exato de inserção e oferece um trecho
> sugerido para review. Nenhum arquivo-fonte foi modificado por esta tarefa (#24).
>
> Arquivo alvo: `src/app/(dashboard)/settings/page.tsx` — **631 linhas**
> (verificado em 2026-09-08). Mapa: linha 500 = fim de `PrivacyTab`;
> 502–577 = `ImportTab`; 579–630 = `ExportTab`; 631 = fim do arquivo.

---

## 1. Decisão de localização

**Recomendado: dentro de `PrivacyTab`, logo ANTES do bloco "Zona de Perigo"
(antes da linha 489), em um card âmbar "Dados de demonstração".**

Motivo: `PrivacyTab` é o único painel que (a) já contém ação destrutiva
(exclusão de conta), (b) já importa `useToast`, `Button` e `confirm()`, e
(c) já recebe `formData`/`setFormData`. O reset de demo é, na semântica da
UI existente, uma ação "destrutiva porém reversível" — pertence à mesma
região cognitiva da Zona de Perigo, com severidade menor.

### Alternativas consideradas e rejeitadas

| Opção | Posição | Por quê rejeitar |
|---|---|---|
| A | Tab nova `"demo"` na lista `tabs` (linhas 79–86) + render em 121 | Exige mudar o union type do `useState` da linha 17, o array `tabs`, e o bloco de render condicional. 3 touch-ups para algo que não é uma seção de configuração. |
| B | Barra fixa no rodapé global (linhas 125–129, ao lado de "Salvar Alterações") | Aparece em TODAS as tabs, inclusive aparência/idioma — ruído. Além disso, o botão de salvar é para `profiles`; misturar "resetar demo" com "salvar perfil" confunde a intenção. |
| C | `ExportTab` (linha 579) | Semântica oposta: export é leitura; reset é exclusão. |
| D | `GeneralTab` (linha 135) | Perfil guarda dados reais do usuário; demonstração é dados fictícios. Misturar degrada a confiança na seção. |

---

## 2. Ponto de inserção exato

Inserir **entre as linhas 488 e 489** — no fim do bloco `space-y-4` de
checkboxes e ANTES do `div` do Zona de Perigo:

```
486 │        </label>
487 │      </div>            ← fim de <div className="space-y-4">
488 │                        ← (em branco)  ← INSERIR AQUI
489 │      <div className="p-4 bg-red-600/10 border border-red-600/20 rounded-lg">
490 │        <h3 className="text-red-400 font-medium mb-2">Zona de Perigo</h3>
```

O wrapper externo `space-y-6` (linha 458) já trata o espaçamento vertical —
não é preciso `mt`/`mb` manual.

---

## 3. Trecho sugerido (NÃO APLICAR — para review)

Insertão na `PrivacyTab` (entre linhas 488 e 489):

```tsx
      {/* Dados de demonstração (#24) — reset do que `scripts/seed-demo.cjs` criou.
          Exibido só para o usuário demo; para usuários reais o card fica oculto. */}
      <DemoResetCard onReset={fetchProfile} />
```

Componente adicionado **após** o fim de `PrivacyTab` (linha 500) e **antes**
de `ImportTab` (linha 502):

```tsx
function DemoResetCard({ onReset }: { onReset: () => void | Promise<void> }) {
  const supabase = createClient();
  const { addToast } = useToast();
  const [resetting, setResetting] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUid(user?.id ?? null));
  }, []);

  // Só o usuário demo vê este card. UID idêntico ao DEFAULT_DEMO_USER_ID de
  // scripts/seed-demo.cjs. Alternativas: profiles.is_admin, ou coluna nova
  // profiles.has_demo_data (ver §4, item 1).
  if (!uid || !DEMO_USER_IDS.includes(uid)) return null;

  async function handleReset() {
    if (!confirm("Apagar TODOS os dados de demonstração da sua biblioteca?")) return;
    setResetting(true);
    try {
      // 1) progresso do usuário
      const { error: e1 } = await supabase
        .from("user_media_progress")
        .delete()
        .eq("user_id", uid);
      if (e1) throw e1;

      // 2) preferências de tag — NECESSÁRIO: o trigger recompute_tag_preferences
    //    roda AFTER INSERT OR UPDATE, então DELETE não zera tags sozinho.
      const { error: e2 } = await supabase
        .from("user_tag_preferences")
        .delete()
        .eq("user_id", uid);
      if (e2) throw e2;

      addToast({ message: "Dados de demonstração removidos.", type: "success" });
      await onReset();
    } catch (err) {
      addToast({
        message: `Falha ao resetar: ${err instanceof Error ? err.message : ""}`,
        type: "error",
      });
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
      <h3 className="text-amber-400 font-medium mb-2">Dados de demonstração</h3>
      <p className="text-zinc-400 text-sm mb-4">
        Sua biblioteca contém dados fictícios gerados por
        <code className="text-zinc-300"> scripts/seed-demo.cjs</code>.
        Removê-los não afeta suas configurações de perfil.
      </p>
      <Button variant="danger" onClick={handleReset} loading={resetting}>
        Resetar dados de demonstração
      </Button>
    </div>
  );
}
```

Constante no topo do arquivo (após o `import type { Profile }`, linha 8):

```tsx
// Usuários para quem o seed de demonstração foi aplicado (#24).
const DEMO_USER_IDS = ["11111111-1111-1111-1111-111111111111"];
```

---

## 4. Decisões que o implementador PRECISA tomar

1. **Critério de visibilidade.** O snippet filtra por UID fixo. Alternativas:
   - `profiles.is_admin` — simples, mas amarra demo a admin.
   - Contagem de `user_media_progress` acima de limiar — frágil, e o botão
     piscaria no primeiro carregamento (exige fetch síncrono).
   - Coluna nova `profiles.has_demo_data BOOLEAN` — **mais limpo**, mas exige
     migration e o seed passando a setá-la. **Recomendado** se o time aceitar.
2. **`fetchProfile` está no escopo de `SettingsPage`, não de `DemoResetCard`.**
   Por isso o snippet a recebe como prop (`<DemoResetCard onReset={fetchProfile} />`
   na linha 121 da `PrivacyTab` — `fetchProfile` já é visível ali, definido na
   linha 29). Alternativas: re-selecionar `profiles` dentro do card, ou
   disparar `window.dispatchEvent(new Event("hubble-profile-changed"))`
   (nenhum dos dois existe hoje).
3. **As exclusões não são transacionais.** Sem RPC criada para isso (o task
   bloqueou endpoint `/api/seed-demo`, o que também aplica a RPC nova), o
   reset é dois `DELETE`s sequenciais. Se o segundo falhar, o primeiro já foi
   aplicado. Aceitável para demo; para dados reais pedir
   `reset_demo_data(p_user_id)` transacional.
4. **`Button variant="danger"` já existe** (`src/shared/ui/Button.tsx:22`).
   `confirm()` global é o padrão já usado na linha 494 deste mesmo arquivo —
   consistente, embora `Modal variant="danger"` (`src/shared/ui/Modal.tsx:82`)
   fosse UX melhor se o time preferir.

---

## 5. Observações de schema relevantes ao reset

- **`user_media_progress` → `user_tag_preferences` NÃO é cascata.** O
  trigger `recompute_tag_preferences` roda `AFTER INSERT OR UPDATE`
  (`20260816000002_triggers.sql:76`), então um `DELETE` de progresso **não**
  zera tags automaticamente. Os dois `DELETE`s são ambos necessários.
- **`DELETE` respeita RLS** (`progress_self` / `tag_prefs_self` →
  `auth.uid() = user_id`), então o anon client do navegador **funciona** sem
  `service_role`. O seed de CLI precisa de `service_role` por outro motivo
  (escreve como `userId` que não é o `auth.uid()` do caller); o reset do
  navegador não precisa.
- **FK `media_catalog` → `user_media_progress` é `ON DELETE CASCADE`**
  (`20260816000001_init_schema.sql:147`) — excluir uma obra do catálogo
  apaga o progresso em cascata. Nada disso acontece no reset do usuário,
  que só toca as duas tabelas do lado do `user_id`.
- **Enum:** o reset não insere nada, então o fato de `user_status_enum`
  NÃO conter `'reading'` (`20260816000001_init_schema.sql:23`) não afeta
  esta UI — mas afeta o seed de CLI, que o respeita.
