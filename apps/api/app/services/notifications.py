"""What emails this app sends, and when — separate from services/email.py
(how to send one) so each admin action stays a one-line call here."""

from app.core.config import settings
from app.models.models import Athlete
from app.services.email import send_email

_ACCENT = "#c4531e"
_ACCENT_SOFT = "#f3e2d6"
_INK = "#1b2320"
_MUTED = "#5b6560"
_BORDER = "#e1e3dc"
_BG = "#f2f1ea"

# Table-based layout, not divs — the gold standard for HTML email, since a
# meaningful slice of recipients still open mail in clients (Outlook desktop
# chief among them) that only reliably support tables for structure.
_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"


def _layout(heading: str, body_html: str, cta_label: str | None = None, cta_href: str | None = None) -> str:
    cta = ""
    if cta_label and cta_href:
        cta = f"""
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px;">
          <tr>
            <td style="background:{_ACCENT};border-radius:8px;">
              <a href="{cta_href}" style="display:inline-block;padding:12px 24px;color:#ffffff;
                 text-decoration:none;font-weight:600;font-size:14px;font-family:{_FONT};">
                {cta_label} &rarr;
              </a>
            </td>
          </tr>
        </table>"""
    return f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{_BG};padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="max-width:520px;background:#ffffff;border:1px solid {_BORDER};border-radius:12px;overflow:hidden;">
            <tr>
              <td style="height:4px;background:{_ACCENT};line-height:4px;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:36px 36px 32px;font-family:{_FONT};">
                <p style="color:{_ACCENT};font-size:12px;font-weight:700;letter-spacing:.1em;
                          text-transform:uppercase;margin:0 0 20px;">
                  Cancha Propia
                </p>
                <h1 style="color:{_INK};font-size:21px;font-weight:700;margin:0 0 16px;line-height:1.3;">
                  {heading}
                </h1>
                <div style="color:{_INK};font-size:15px;line-height:1.65;">{body_html}</div>
                {cta}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 36px;border-top:1px solid {_BORDER};font-family:{_FONT};">
                <p style="color:{_MUTED};font-size:12px;line-height:1.5;margin:0;">
                  Cancha Propia — descubrimiento y confianza para atletas argentinos. La plataforma nunca
                  procesa ni retiene transferencias; los aportes van directo al atleta.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    """


def notify_application_received(athlete: Athlete) -> None:
    send_email(
        athlete.contact_email,
        "Recibimos tu postulación",
        _layout(
            "¡Recibimos tu postulación!",
            f"<p>Hola {athlete.full_name.split(' ')[0]},</p>"
            "<p>Un administrador va a revisar tu información y evidencia en los próximos días. "
            "Te vamos a escribir de nuevo apenas tengamos una respuesta.</p>",
        ),
    )


def notify_approved(athlete: Athlete) -> None:
    send_email(
        athlete.contact_email,
        "¡Tu perfil fue aprobado!",
        _layout(
            "¡Tu perfil ya está publicado!",
            f"<p>Hola {athlete.full_name.split(' ')[0]},</p>"
            "<p>Revisamos tu postulación y tu perfil ya es visible en la plataforma. "
            "Entrá a tu panel para completarlo — foto, historia y campaña, si querés sumar una.</p>",
            cta_label="Ir a mi panel",
            cta_href=f"{settings.web_origin}/dashboard",
        ),
    )


def notify_rejected(athlete: Athlete) -> None:
    reason_html = f"<p><strong>Motivo:</strong> {athlete.rejection_reason}</p>" if athlete.rejection_reason else ""
    send_email(
        athlete.contact_email,
        "Tu postulación no fue aprobada",
        _layout(
            "Tu postulación no fue aprobada",
            f"<p>Hola {athlete.full_name.split(' ')[0]},</p>"
            "<p>Esta vez no pudimos aprobar tu postulación.</p>"
            f"{reason_html}"
            "<p>Podés corregirla y volver a enviarla — hay un breve período de espera antes de poder "
            "reintentar, que vas a ver reflejado en tu panel.</p>",
            cta_label="Ver mi panel",
            cta_href=f"{settings.web_origin}/dashboard",
        ),
    )


def notify_info_requested(athlete: Athlete) -> None:
    message_html = (
        f"<p style='background:{_ACCENT_SOFT};border-left:3px solid {_ACCENT};padding:12px 16px;"
        f"border-radius:6px;margin:16px 0;'>{athlete.info_requested_message}</p>"
        if athlete.info_requested_message
        else ""
    )
    send_email(
        athlete.contact_email,
        "Necesitamos más información para revisar tu postulación",
        _layout(
            "Necesitamos un dato más",
            f"<p>Hola {athlete.full_name.split(' ')[0]},</p>"
            "<p>Un administrador pidió más información antes de poder revisar tu postulación:</p>"
            f"{message_html}"
            "<p>Podés actualizarla directamente desde tu panel.</p>",
            cta_label="Actualizar mi postulación",
            cta_href=f"{settings.web_origin}/apply",
        ),
    )


def notify_suspended(athlete: Athlete) -> None:
    reason_html = f"<p><strong>Motivo:</strong> {athlete.suspended_reason}</p>" if athlete.suspended_reason else ""
    send_email(
        athlete.contact_email,
        "Tu perfil fue suspendido temporalmente",
        _layout(
            "Tu perfil fue suspendido",
            f"<p>Hola {athlete.full_name.split(' ')[0]},</p>"
            "<p>Tu perfil ya no está visible públicamente mientras revisamos una situación puntual.</p>"
            f"{reason_html}"
            "<p>Escribinos si creés que es un error.</p>",
        ),
    )


def notify_reactivated(athlete: Athlete) -> None:
    send_email(
        athlete.contact_email,
        "Tu perfil volvió a estar activo",
        _layout(
            "¡Ya estás de vuelta!",
            f"<p>Hola {athlete.full_name.split(' ')[0]},</p>"
            "<p>Tu perfil volvió a estar visible en la plataforma.</p>",
            cta_label="Ver mi perfil",
            cta_href=f"{settings.web_origin}/athletes/{athlete.slug}",
        ),
    )
