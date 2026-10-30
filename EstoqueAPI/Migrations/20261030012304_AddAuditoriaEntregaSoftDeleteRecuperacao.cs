using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EstoqueAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditoriaEntregaSoftDeleteRecuperacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Ativo",
                table: "Solicitantes",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "DataEntrega",
                table: "Solicitacoes",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EntreguePor",
                table: "Solicitacoes",
                type: "TEXT",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Ativo",
                table: "Doadores",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "SenhaResetTokens",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Token = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    UsuarioId = table.Column<int>(type: "INTEGER", nullable: false),
                    ExpiraEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Usado = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SenhaResetTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SenhaResetTokens_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SenhaResetTokens_Token",
                table: "SenhaResetTokens",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SenhaResetTokens_UsuarioId",
                table: "SenhaResetTokens",
                column: "UsuarioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SenhaResetTokens");

            migrationBuilder.DropColumn(
                name: "Ativo",
                table: "Solicitantes");

            migrationBuilder.DropColumn(
                name: "DataEntrega",
                table: "Solicitacoes");

            migrationBuilder.DropColumn(
                name: "EntreguePor",
                table: "Solicitacoes");

            migrationBuilder.DropColumn(
                name: "Ativo",
                table: "Doadores");
        }
    }
}
