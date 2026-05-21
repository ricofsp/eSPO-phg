import { ChevronLeft, ChevronRight, Eye, Pencil } from "lucide-react";

function formatDateTime(str) {
  if (!str) return "-";
  const d = new Date(str);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDate(str) {
  if (!str) return "-";
  const d = new Date(str);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default function DocumentTable({
  documents,
  pagination,
  loading,
  divisions,
  isAdmin,
  onEdit,
  onDelete,
  onPageChange,
}) {
  const { page, totalPages, total, limit } = pagination;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const divisiLabel = (ids) => {
    if (!ids) return null;
    return ids
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  // Kolom admin:  No | Edit | Judul | Baca | Nomor Dok. | Pemilik | Nama File | Divisi
  // Kolom user:   No | Baca | Judul Dokumen | Nomor Dok. | Tanggal | Pemilik
  const colSpanCount = isAdmin ? 8 : 6;

  return (
    <div
      className="overflow-hidden border rounded-xl"
      style={{
        background: "var(--c-card)",
        borderColor: "var(--c-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="overflow-x-auto">
        <table
          className="w-full"
          style={{ minWidth: isAdmin ? "900px" : "700px" }}
        >
          <thead>
            <tr
              style={{
                background: "var(--c-hover)",
                borderBottom: "1px solid var(--c-border)",
              }}
            >
              <th className="table-th" style={{ width: '40px' }}>No</th>
              {isAdmin && <th className="table-th" style={{ width: '48px' }}>Edit</th>}
              <th className="table-th" style={{ width: '48px' }}>Baca</th>
              <th className="table-th" style={isAdmin ? { maxWidth: '200px' } : {}}>{ isAdmin ? 'Judul' : 'Judul Dokumen'}</th>
              <th className="table-th" style={{ width: '160px' }}>Nomor Dok.</th>
              {!isAdmin && <th className="table-th" style={{ width: '100px' }}>Tanggal</th>}
              <th className="table-th" style={{ width: '120px' }}>Pemilik</th>
              {isAdmin && <th className="table-th" style={{ width: '160px' }}>Nama File</th>}
              {isAdmin && <th className="table-th" style={{ width: '280px' }}>Divisi</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: "1px solid var(--c-border)" }}
                >
                  {Array.from({ length: colSpanCount }).map((_, j) => (
                    <td key={j} className="table-td">
                      <div
                        className="h-4 rounded animate-pulse"
                        style={{ background: "var(--c-hover)" }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : documents.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpanCount}
                  className="py-16 text-sm text-center text-ink-faint"
                >
                  Belum ada dokumen SPO
                </td>
              </tr>
            ) : (
              documents.map((doc, idx) => {
                const divisiTags = divisiLabel(doc.divisi_id);
                const inactive = doc.deleted_at || !doc.is_active;
                const aktifDate = doc.updated_at || doc.created_at;
                const aktifOleh = doc.updated_by_nama || doc.created_by_nama;

                return (
                  <tr
                    key={doc.id}
                    className="table-row"
                    style={
                      inactive ? { background: "rgba(239,68,68,0.06)" } : {}
                    }
                  >
                    {/* No */}
                    <td className="text-xs text-center table-td text-ink-faint">
                      {start + idx}
                    </td>

                    {/* Edit (admin only) */}
                    {isAdmin && (
                      <td className="table-td">
                        <button type="button" onClick={() => onEdit(doc)} title="Edit"
                          className="flex items-center justify-center transition-all rounded-md cursor-pointer w-7 h-7 text-ink-faint"
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(1,92,128,0.1)"; e.currentTarget.style.color = "#015c80"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = ""; }}
                        >
                          <Pencil size={13} />
                        </button>
                      </td>
                    )}

                    {/* Baca */}
                    <td className="text-center table-td">
                      {doc.url_dokumen ? (
                        <button type="button" onClick={() => window.open(`/viewer/${doc.id}`, "_blank")}
                          title={doc.nama_dokumen}
                          className="flex items-center justify-center w-8 h-8 mx-auto transition-all border rounded-md cursor-pointer"
                          style={{ borderColor: "var(--c-border)", color: "var(--c-text-muted)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(1,92,128,0.08)"; e.currentTarget.style.color = "#015c80"; e.currentTarget.style.borderColor = "#015c80"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = ""; e.currentTarget.style.borderColor = ""; }}
                        >
                          <Eye size={13} />
                        </button>
                      ) : (
                        <span className="text-xs text-ink-faint">—</span>
                      )}
                    </td>

                    {/* Judul */}
                    <td className="table-td">
                      <span className="block text-sm leading-snug"
                        style={{ color: inactive ? "#F87171" : "var(--c-text)" }}
                        title={doc.judul}
                      >
                        {doc.judul || <span className="text-sm italic text-ink-faint">—</span>}
                      </span>
                      {isAdmin && aktifDate && (
                        <span className="text-xs mt-0.5 block" style={{ color: "#015c80" }}>
                          {formatDateTime(aktifDate)}{aktifOleh ? ` oleh ${aktifOleh}` : ""}
                        </span>
                      )}
                    </td>

                    {/* Nomor Dok. */}
                    <td className="table-td text-sm text-ink-muted">{doc.nomor_dokumen || "-"}</td>

                    {/* Tanggal (user only) */}
                    {!isAdmin && (
                      <td className="table-td text-sm text-ink-muted">{formatDate(doc.created_at)}</td>
                    )}

                    {/* Pemilik */}
                    <td className="table-td text-sm text-ink-muted">{doc.pemilik || "-"}</td>

                    {/* Nama File (admin only) */}
                    {isAdmin && (
                      <td className="table-td text-sm text-ink-muted">{doc.nama_dokumen || "-"}</td>
                    )}

                    {/* Divisi (admin only) */}
                    {isAdmin && (
                      <td className="table-td text-sm text-ink-muted">
                        {divisiTags?.length ? divisiTags.join(", ") : <span className="text-ink-faint">-</span>}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && total > 0 && (
        <div
          className="flex items-center justify-between px-5 py-3 border-t"
          style={{
            borderColor: "var(--c-border)",
            background: "var(--c-hover)",
          }}
        >
          <p className="text-xs text-ink-faint">
            Menampilkan{" "}
            <span className="font-medium text-ink-muted">
              {start}–{end}
            </span>{" "}
            dari <span className="font-medium text-ink-muted">{total}</span> SPO
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="flex items-center justify-center transition-all rounded-md cursor-pointer w-7 h-7 disabled:opacity-30 disabled:cursor-not-allowed text-ink-faint"
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled)
                  e.currentTarget.style.background = "var(--c-card)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "";
              }}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
              )
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && arr[idx - 1] !== p - 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span
                    key={`e-${i}`}
                    className="flex items-center justify-center text-xs w-7 h-7 text-ink-faint"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPageChange(p)}
                    className="flex items-center justify-center text-xs font-semibold transition-all rounded-md cursor-pointer w-7 h-7"
                    style={
                      p === page
                        ? {
                            background: "#015c80",
                            color: "#FFF",
                            boxShadow: "0 2px 8px rgba(1,92,128,0.35)",
                          }
                        : { color: "var(--c-text-muted)" }
                    }
                    onMouseEnter={(e) => {
                      if (p !== page)
                        e.currentTarget.style.background = "var(--c-card)";
                    }}
                    onMouseLeave={(e) => {
                      if (p !== page) e.currentTarget.style.background = "";
                    }}
                  >
                    {p}
                  </button>
                ),
              )}
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="flex items-center justify-center transition-all rounded-md cursor-pointer w-7 h-7 disabled:opacity-30 disabled:cursor-not-allowed text-ink-faint"
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled)
                  e.currentTarget.style.background = "var(--c-card)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "";
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
