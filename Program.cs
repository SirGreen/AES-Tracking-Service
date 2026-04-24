using System.Data.Common;
using System.Data;
using System.Text.Json.Serialization;
using BTL_AES.Data;
using BTL_AES.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        // Allow the React frontend to communicate with the API
        policy.WithOrigins("http://localhost:5173") 
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=childtracking.db"));
builder.Services.AddScoped<IRuleEvaluationService, RuleEvaluationService>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    EnsureSchemaCompatibility(dbContext);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();

static void EnsureSchemaCompatibility(AppDbContext dbContext)
{
    dbContext.Database.EnsureCreated();

    var connection = dbContext.Database.GetDbConnection();
    var shouldCloseConnection = connection.State != ConnectionState.Open;

    if (shouldCloseConnection)
    {
        connection.Open();
    }

    try
    {
        var existingColumns = GetRulesColumnNames(connection);

        var hasLegacyUtcColumns = existingColumns.Contains("StartTimeUtc") || existingColumns.Contains("EndTimeUtc");
        if (hasLegacyUtcColumns)
        {
            RebuildRulesTableToCurrentSchema(connection, existingColumns);
            existingColumns = GetRulesColumnNames(connection);
        }

        if (!existingColumns.Contains("StartTime"))
        {
            using var addStartTimeColumnCommand = connection.CreateCommand();
            addStartTimeColumnCommand.CommandText = "ALTER TABLE \"Rules\" ADD COLUMN \"StartTime\" TEXT NOT NULL DEFAULT '00:00:00';";
            addStartTimeColumnCommand.ExecuteNonQuery();
        }

        if (!existingColumns.Contains("EndTime"))
        {
            using var addEndTimeColumnCommand = connection.CreateCommand();
            addEndTimeColumnCommand.CommandText = "ALTER TABLE \"Rules\" ADD COLUMN \"EndTime\" TEXT NOT NULL DEFAULT '23:59:59';";
            addEndTimeColumnCommand.ExecuteNonQuery();
        }
    }
    finally
    {
        if (shouldCloseConnection)
        {
            connection.Close();
        }
    }
}

static HashSet<string> GetRulesColumnNames(DbConnection connection)
{
    var columnNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    using var pragmaCommand = connection.CreateCommand();
    pragmaCommand.CommandText = "PRAGMA table_info(\"Rules\");";

    using var reader = pragmaCommand.ExecuteReader();
    while (reader.Read())
    {
        columnNames.Add(reader.GetString(1));
    }

    return columnNames;
}

static void RebuildRulesTableToCurrentSchema(DbConnection connection, HashSet<string> existingColumns)
{
    var startTimeSources = new List<string>();
    if (existingColumns.Contains("StartTime"))
    {
        startTimeSources.Add("NULLIF(\"StartTime\", '')");
    }

    if (existingColumns.Contains("StartTimeUtc"))
    {
        // SQLite stores DateTime as text; HH:mm:ss starts at position 12.
        startTimeSources.Add("substr(\"StartTimeUtc\", 12, 8)");
    }

    startTimeSources.Add("'00:00:00'");

    var endTimeSources = new List<string>();
    if (existingColumns.Contains("EndTime"))
    {
        endTimeSources.Add("NULLIF(\"EndTime\", '')");
    }

    if (existingColumns.Contains("EndTimeUtc"))
    {
        // SQLite stores DateTime as text; HH:mm:ss starts at position 12.
        endTimeSources.Add("substr(\"EndTimeUtc\", 12, 8)");
    }

    endTimeSources.Add("'23:59:59'");

    var startTimeExpression = $"COALESCE({string.Join(", ", startTimeSources)})";
    var endTimeExpression = $"COALESCE({string.Join(", ", endTimeSources)})";

    using var rebuildCommand = connection.CreateCommand();
    rebuildCommand.CommandText = $@"
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

CREATE TABLE ""__Rules_new"" (
    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_Rules"" PRIMARY KEY AUTOINCREMENT,
    ""Name"" TEXT NOT NULL,
    ""ChildName"" TEXT NOT NULL,
    ""RuleType"" TEXT NOT NULL,
    ""StartTime"" TEXT NOT NULL,
    ""EndTime"" TEXT NOT NULL,
    ""CenterLatitude"" REAL NULL,
    ""CenterLongitude"" REAL NULL,
    ""RadiusMeters"" REAL NULL,
    ""PolygonCoordinatesJson"" TEXT NULL,
    ""CreatedAtUtc"" TEXT NOT NULL
);

INSERT INTO ""__Rules_new"" (
    ""Id"", ""Name"", ""ChildName"", ""RuleType"", ""StartTime"", ""EndTime"",
    ""CenterLatitude"", ""CenterLongitude"", ""RadiusMeters"", ""PolygonCoordinatesJson"", ""CreatedAtUtc""
)
SELECT
    ""Id"",
    ""Name"",
    ""ChildName"",
    ""RuleType"",
    {startTimeExpression},
    {endTimeExpression},
    ""CenterLatitude"",
    ""CenterLongitude"",
    ""RadiusMeters"",
    ""PolygonCoordinatesJson"",
    ""CreatedAtUtc""
FROM ""Rules"";

DROP TABLE ""Rules"";
ALTER TABLE ""__Rules_new"" RENAME TO ""Rules"";

COMMIT;
PRAGMA foreign_keys = ON;";
    rebuildCommand.ExecuteNonQuery();
}
